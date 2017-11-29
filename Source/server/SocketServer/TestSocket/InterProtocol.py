
cmd_type = "cmdtype"
sock_req_cmd = "sockreq"
sock_resp = "sockresp"
sock_result = "result"
sock_result_error = "ERROR"
sock_result_ok = "OK"
sock_error_message = "errmsg"



client_req_type_join_game = "join-game"   # 开始游戏
client_req_select_action = "sel-act"
client_req_type_reconnect = "reconnect"   # 断线重连
client_req_type_exe_cmd = "exe-cmd"
client_req_exe_cmd = "cmd"
client_req_cmd_param = "cmd-data"

server_cmd_type_push = "sockpush"
server_push_new_banker = "new-banker"
server_push_deal_cards = "deal-cards"
server_push_cmd_opts = "cmd-opts"
server_push_def_cmd = "def-cmd"
server_push_cmd_param = "cmd-param"
server_push_cmd_resp_timeout = "resp-timeout"
server_push_game_end = "game-end"
server_push_winners = "winners"
server_push_losers = "losers"
server_push_player_exed_cmd = "exed-cmd"

cmd_data_cards = "cards"


room_id = "roomid"
user_id = "userid"
game_id = "gameid"

majiang_player_act_gang = "gang"
majiang_player_act_peng = "peng"
majiang_player_act_hu = "hu"
majiang_player_act_chi = "chi"
majiang_player_act_zimo = "zi mo"
majiang_player_act_mopai = "mo pai"
majiang_player_act_pass = "guo"
majiang_player_act_play_card = "chu pai"

# the cmd with less index has the higher priority. that is  majiang_player_act_zimo has the highest priority.
majiang_acts_priorities = [majiang_player_act_zimo, majiang_player_act_hu,
                           majiang_player_act_gang, majiang_player_act_peng,
                           majiang_player_act_chi, majiang_player_act_mopai,
                           majiang_player_act_play_card, majiang_player_act_pass ]

min_room_id = 10   # valid room id should > 10


def create_deal_cards_json_packet(player, cards):
    packet = {
        cmd_type: server_cmd_type_push,
        server_cmd_type_push: server_push_deal_cards,
        cmd_data_cards: cards
    }
    return packet

def create_player_exed_cmd_json_packet(player, cmd, cmd_data):
    packet = {
        cmd_type: server_cmd_type_push,
        server_cmd_type_push: server_push_player_exed_cmd,
        server_push_player_exed_cmd: cmd,
        server_push_cmd_param:cmd_data,
        user_id:player.get_user_id()
    }
    return packet

def create_cmd_options_json_packet(player, cmd_options, def_cmd=None, resp_timeout=-1):
    opts = []
    for v in cmd_options:
        opts.append({"cmd":v.get_cmd(),"cmd-param":v.get_cmd_param()})

    packet = {
        cmd_type: server_cmd_type_push,
        server_cmd_type_push: server_push_cmd_opts,
        server_push_cmd_opts:opts,
        server_push_cmd_resp_timeout:resp_timeout
    }
    if def_cmd:
        packet[server_push_def_cmd] = {"cmd":def_cmd.get_cmd(), "cmd-param":def_cmd.get_cmd_param()}

    return packet


def create_error_json_packet(player, err_msg):
    pass


def create_publish_bank_player_json_packet(bank_player):
    packet = {cmd_type: server_cmd_type_push,
           server_cmd_type_push: server_push_new_banker,
           user_id: bank_player.get_user_id()
           }
    return packet


def create_winners_losers_json_packet(winners, losers):
    ws = []
    for p in winners:
        ws.append({user_id:p.get_user_id(), "score":0})
    ls = []
    for p in losers:
        ls.append({user_id:p.get_user_id(),"score":0})
    packet = {
        cmd_type: server_cmd_type_push,
        server_cmd_type_push: server_push_game_end,
        server_push_winners:ws,
        server_push_losers:ls
    }
    return packet

def create_request_error_packet(player_req_cmd):
    packet = {
        cmd_type: sock_resp,
        sock_resp: player_req_cmd,
        sock_result: sock_result_error,
        sock_error_message: "invalid request"
    }
    return packet