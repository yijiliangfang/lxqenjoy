from Actions.ActionGroup import ActionGroup


class ActionBase:
    def __init__(self, text, act_id):
        self.__act_text = text
        self.__act_id = act_id
        self.__follow_up_action_group = None
        self.__my_player = None
        self.__my_game_round = None

    def get_act_text(self):
        return self.__act_text

    def get_act_id(self):
        return self.__act_id

    def get_my_player(self):
        return self.__my_player

    def get_my_round(self):
        return self.__my_game_round

    def get_follow_up_action_group(self):
        return self.__follow_up_action_group

    def find_follow_action_from_id(self, action_id):
        if self.get_act_id() == action_id:
            return self

        if self.__follow_up_action_group:
            for a in self.__follow_up_action_group.get_actions():
                sub_a = a.find_follow_action_from_id(action_id)
                if sub_a:
                    return sub_a
        return None

    def set_act_text(self, text):
        self.__act_text = text

    def set_execute_context(self, player, game_round):
        self.__my_game_round = game_round
        self.__my_player = player

    def add_follow_up_action(self, action, as_default_action=False):
        if not self.__follow_up_action_group:
            self.__follow_up_action_group = ActionGroup()

        self.__follow_up_action_group.add_action(action, as_default_action)
        return action

    def to_json_object(self):
        return {"act-id":self.__act_id, "act-text":self.__act_text};

    def to_broadcast_json_object(self):
        return {"act-id": self.__act_id, "act-text": self.__act_text}

    def execute(self):
        pass

