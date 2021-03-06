
var log = require('./log.js');
log.configure();
var logger = log.logger();
var uuid = require('uuid');

var errors = require('./errors.js');

var express = require('express');
var app = express();

app.use(log.useLog());

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


var api_protocal = require("./api-protocal.js");
var db = require('./db.js');
var utils = require('./utils.js');

var conn = db.conn();


app.post('/service', function(req, res){
    try{
        jsonReq = JSON.stringify(req.body);
        var reqObj = JSON.parse(jsonReq);
        if (api_protocal.cmd_type_httpreq in reqObj){
            dispatch_request(reqObj[api_protocal.cmd_type_httpreq], reqObj, res);
        }
        else{
            res.end("invalid request!")
        }
    }
    catch(err){
        logger.error(err);
    }
});

var server = app.listen(8081, function () {
    // body...
    var host = server.address().address;
    var port = server.address().port;

    console.log("address visited http://%s:%s", host, port)
});

function generate_session_token(userid) {

    var vid = uuid.v1();

    return vid;
}

function create_error_repsonse(cmd, errMsg) {
    var pack = {
        cmdtype: api_protocal.cmd_type_httpresp,
        httpresp: cmd,
        result: api_protocal.cmd_resp_ERROR,
        errmsg: errMsg
    };

    return JSON.stringify(pack);
}

function create_success_response(cmd, msg) {
    var pack = {
        "cmdtype": api_protocal.cmd_type_httpresp,
        "httpresp": cmd,
        "result": api_protocal.cmd_resp_OK,
        "result-data": msg
    };
    return JSON.stringify(pack);
}

function create_success_ext_response(cmd, propObj, msg) {
    var pack = {
        "cmdtype": api_protocal.cmd_type_httpresp,
        "httpresp": cmd,
        "result": api_protocal.cmd_resp_OK,
        "result-data": msg
    };

    var props = Object.getOwnPropertyNames(propObj);
    props.forEach(function (val, index, arr) {
        pack[val] = propObj[val];
    })

    return JSON.stringify(pack);
}

function dispatch_request(req_cmd, req_obj, resp){
    if (req_cmd == api_protocal.req_cmd_newuser){
        process_new_user(req_obj, resp)
    }
    else if (req_cmd == api_protocal.req_cmd_login){
        process_login(req_obj, resp);
    }
    else if (req_cmd == api_protocal.req_cmd_set_pwd){
        process_set_password(req_obj, resp);
    }
    else if (req_cmd == api_protocal.req_cmd_add_dev){
        process_add_device(req_obj, resp);
    }
}

function process_set_password(req_obj, resp){
    try{
        var newPwd = req_obj[api_protocal.req_param_pwd];
        var userid = req_obj[api_protocal.req_userid];
        var devid = req_obj[api_protocal.req_param_devid];
        var cmd = req_obj[api_protocal.cmd_type_httpreq];

        is_device_valid(userid, devid,
            function (err) {
                resp_pack = create_error_repsonse(cmd, err);
                resp.end(resp_pack);
            },
            function (ret_msg) {
                if (ret_msg === errors.cbt_valid_device) {
                    var temp = "update user set password = '{0}' where userid={1}";
                    sql = temp.format(newPwd, userid);
                    conn.query(sql, function (err, result) {
                        if (err) {
                            logger.error(err);
                            var resp_pack = create_error_repsonse(cmd, err);
                            resp.end(resp_pack);
                        }
                        else {
                            var resp_pack = create_success_response(cmd, "");
                            resp.end(resp_pack);
                        }
                    });
                }
                else {
                    var resp_pack = create_error_repsonse(cmd, errors.cbt_invalid_device);
                    resp.end(resp_pack);
                }
            });
    }
    catch (err){
        logger.exception(err);
    }
}

function process_add_device(req_obj, resp){
    try{
        var dev_id = req_obj[api_protocal.req_param_devid];
        var userid = req_obj[api_protocal.req_userid];
        var pwd = req_obj[api_protocal.req_param_pwd];
        var cmd = req_obj[api_protocal.cmd_type_httpreq];

        is_password_right(userid, pwd,
            function (err) {
                var resp_pack = create_error_repsonse(cmd, err);
                resp.end(err);

            },
            function (ret_msg) {
                if (ret_msg !== errors.cbt_valid_password){
                    var resp_pack = create_error_repsonse(cmd, ret_msg);
                    resp.end(resp_pack);
                }
                else {
                    is_device_valid(userid, dev_id,
                        function (err) {
                            var resp_pack = create_error_repsonse(cmd, err);
                            resp.end(resp_pack);
                        },
                        function (ret_msg) {
                            if (ret_msg !==errors.cbt_valid_device){
                                record_user_device(userid, dev_id,
                                    function (err) {
                                        var resp_pack = create_error_repsonse(cmd, err);
                                        resp.end(resp_pack);
                                    },
                                    function (ret_msg) {
                                        var resp_pack = create_success_response(cmd,ret_msg);
                                        resp.end(resp_pack);
                                    }
                                );
                            }
                            else{
                                var resp_pack = create_error_repsonse(cmd, api_protocal.ERROR_DEVICE_ALREADY_REGISTERED);
                                resp.end(resp_pack);
                            }
                        }
                    );
                }
            }
        );
    }
    catch (err){
        logger.exception(err);
    }
}

function is_user_exist(userid, err_callback, result_callback) {
    var temp = "select count(userid) from user where userid = {0}";
    var sql = temp.format(userid);
    conn.query(sql, function (err, result) {
        if(err && err_callback){
            err_callback(err);
        }
        else if (result_callback){
            if(result.length > 0){
                result_callback(errors.cbt_valid_userid);
            }
            else{
                result_callback(errors.cbt_invalid_userid);
            }
        }
    });
}

function is_device_valid(userid, devid, err_callback, result_callback) {
    is_user_exist(userid, err_callback,
        function (ret_msg) {
            if (result_callback){
                if (ret_msg == errors.cbt_valid_userid){
                    var temp = "select count(userid) as cid from user_device where userid={0} and device='{1}'";
                    var sql = temp.format(userid, devid);
                    conn.query(sql, function (err, result) {
                        if (err){
                            if (err_callback){
                                err_callback(err);
                            }
                        }
                        else{
                            if (result['cid'] > 0){
                                result_callback(errors.cbt_valid_device);
                            }
                            else{
                                result_callback(errors.cbt_invalid_device);
                            }
                        }
                    });
                }
                else{
                    result_callback(errors.cbt_invalid_userid);
                }
        }

    });

}

function is_password_right(userid, password, err_callback, result_callback) {
    is_user_exist(userid, err_callback, function (ret) {
        if (ret == errors.cbt_valid_userid){
            var tmp = "select count(userid) as uid from user where userid={0} and password='{1}'";
            sql = tmp.format(userid, password);
            conn.query(sql, function(err, result){
               if (err){
                   if (err_callback){
                       err_callback(err);
                   }
               }
               else if (result_callback){
                   if (result.length > 0){
                       result_callback(errors.cbt_valid_password);
                   }
                   else{
                       result_callback(errors.cbt_invalid_pwd);
                   }
               }
            });
        }
        else {
            result_callback(errors.cbt_invalid_userid);
        }
    });
}

function is_dev_register(userid, devid, callback){
    var tmp = "select count(*) from user_device where userid={0} and device='{1}'";
    var sql = tmp.format(userid, devid);
    conn.query(sql, function(err, result){

    })
}

function process_new_user(req_obj, resp) {
    try{
        var dev_id = req_obj[api_protocal.req_param_devid]
        var cmd = req_obj[api_protocal.cmd_type_httpreq];
        get_is_device_already_registered(dev_id,
            function(err){
                resp_str = create_error_repsonse(cmd, err);
                logger.error(err);
                resp.end(resp_str);
            },
            function (ret_msg) {
                if (ret_msg === errors.cbt_device_found){
                    resp_str = create_error_repsonse(cmd, errors.ERROR_DEVICE_ALREADY_REGISTERED);
                    logger.error(resp_str);
                    resp.end(resp_str);
                }
                else{
                    add_new_user(dev_id,
                        function(err){
                            var resp_str = create_error_repsonse(cmd, errors.ERROR_FAILED_CREATE_USER);
                            logger.error(resp_str);
                            resp.end(resp_str);
                        },
                        function(userObj){
                            var user_str = JSON.stringify(userObj);
                            var resp_str = create_success_response(cmd, user_str);
                            resp.end(resp_str);
                        }
                    );
                }
            });
    }
    catch (err){
        logger.exception(err)
    }
}


function update_user_login_token(userid, dev_id, err_callback, ret_callback) {
    var temp = "select userid from user_login where userid={0}";
    var sql = temp.format(userid);
    conn.query(sql, function (err, result) {
        if (err){
            if (err_callback){
                err_callback(err);
            }
        }
        else{
            token = generate_session_token(userid);
            if (result.length > 0){
                temp = "update user_login set device='{0}',session_token='{1}' where userid={2}";
                sql = temp.format(dev_id, token, userid);
            }
            else{
                temp = "insert into user_login(userid, device, session_token) values({0},'{1}','{2}');";
                sql = temp.format(userid, dev_id, token);
            }
            conn.query(sql, function (err, result) {
                if(err){
                    if(err_callback){
                        err_callback(err);
                    }
                }
                else if(ret_callback){
                    ret_callback(token);
                }
            })
        }
    })
}

function get_is_device_already_registered(dev_id, err_callback, ret_callback) {
    var template = "select device from user_device where device = '{0}'";
    var sql = template.format(dev_id);
    console.log(sql);
    conn.query(sql, function (err, result) {
        if (err){
            if (err_callback){
                err_callback(err);
            }
        }
        else if (ret_callback){
            if (result.length > 0){
                ret_callback(errors.cbt_device_found);
            }
            else{
                ret_callback(errors.cbt_device_not_found);
            }
        }
    });
}

function record_user_device(userid, dev_id, err_callback, ret_callback) {
    var temp = "insert into user_device(userid, device) values({0},'{1}');";
    var sql = temp.format(userid, dev_id);
    conn.query(sql, function (err, resutl) {
        if (err){
            if (err_callback){
                err_callback(err);
            }
        }
        else if (ret_callback){
            ret_callback(errors.cbt_record_device_ok);
        }
    });
}

function add_new_user(dev_id, err_callback, ret_callback){
    var temp = "select count({0}) as cid from {1}";
    var sql = temp.format(db.field_userid, db.table_user);
    console.log(sql);
    conn.query(sql, function(err, result){
        if (err){
            if (err_callback){
                err_callback(err);
            }
        }
        else{
            var username = "LX" + (result[0].cid + db.username_start_number + 1)
            var sql = "insert into {0}({1}) values('{2}')".format(db.table_user, db.field_username, username);
            conn.query(sql, function (err, result) {
                if (err) {
                    if (err_callback){
                        err_callback(err);
                    }
                }
                else {
                    var newId = result.insertId;
                    var sql = "insert into {0}({1},{2}) values ({3},'{4}');".format(db.table_user_device,
                        db.field_userid, db.field_device, newId, dev_id);
                    conn.query(sql, function (err, result) {
                        if (err){
                            if (err_callback){
                                err_callback(err);
                            }
                        }
                        else if (ret_callback){
                            var newUser = {
                                "userid":newId,
                                "username":username
                            };
                            ret_callback(newUser);
                        }
                    });
                }
            });
        }
    });
}

function get_user_info(user_id, callback){
    var template = "select username from {0} where userid = {1}";
    var sql = template.format(db.table_user, user_id);
    conn.query(sql, function(err, result){
        if (err){
            logger.error(err)
        }
        else if (result.length > 0){
            var username = result[0].username;
            if (null != callback){
                callback(username);
            }
        }
    });
}


function process_login(req_obj, resp) {
    var temp = "select userid from user_device where userid={0} and device='{1}'";
    var user_id = req_obj[api_protocal.req_userid];
    var device = req_obj[api_protocal.req_param_devid];
    var cmd = req_obj[api_protocal.cmd_type_httpreq];
    var sql = temp.format(user_id, device);
    conn.query(sql, function (err, result) {
        if (err){
            var resp_str = create_error_repsonse(cmd, err);
            logger.error(err);
            resp.end(resp_str);
        }
        else {
            if (result.length > 0) {
                update_user_login_token(user_id, device,
                    function(err){
                        var resp_str = create_error_repsonse(cmd, err);
                        logger.error(resp_str);
                        resp.end(resp_str);
                    },
                    function (token) {
                    if (token){
                        var extProps = {
                            "session-token":token
                        };
                        var resp_str = create_success_ext_response(cmd, extProps, "");
                        resp.end(resp_str);
                    }
                    else{
                        var resp_str = create_error_repsonse(cmd, errors.ERROR_FAILED_LOGIN);
                        resp.end(resp_str);
                    }
                });
            }
            else{
                var err_resp = create_error_repsonse(cmd, errors.ERROR_DEVICE_NOT_REGISTERED);
                resp.end(err_resp);
            }
        }
    });
}
