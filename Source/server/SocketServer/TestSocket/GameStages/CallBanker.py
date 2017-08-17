from GameStages.GameStage import GameStage

from threading import Timer


class CallBanker(GameStage):
    COMMAND_CALL_BANKER = "call-banker"

    def __init__(self, rule):
        super(CallBanker, self).__init__(rule)
        self.__cur_call_player_idx = -1
        self.__cur_call_action_id = ""
        self.__pre_call_action = None
        self.__timer_for_call = None
        self.__current_player = None

    def is_completed(self):
        return False

    def begin(self):
        self.begin_players_call_process()

    def begin_players_call_process(self):
        self.make_next_player_select_action(None)

    def make_next_player_select_action(self, prev_action_id):
        player = self.get_next_call_player()
        call_acts_group = self.get_next_call_action_group(prev_action_id)
        self.__pre_call_action = call_acts_group.get_default_action()
        if player and call_acts_group:
            # cmd_obj = {"cmd": CallBanker.COMMAND_CALL_BANKER,
            #           "actions": call_acts_group.to_json() }
            self.start_timer_to_publish_player_call_action(call_acts_group.get_select_timeout())
            # player.send_server_command(cmd_obj)
            self.tell_player_to_select_call_actions(player, call_acts_group)

    def tell_player_to_select_call_actions(self, player, act_group):
         cmd_obj = {"cmd": CallBanker.COMMAND_CALL_BANKER,
                       "actions": act_group.to_json() }
         self.__current_player = player
         player.send_server_command(cmd_obj)
                 
    def get_next_call_player(self):
        self.__cur_call_player_idx += 1
        players = self.get_my_players()
        if self.__cur_call_player_idx >= len(players):
            self.__cur_call_player_idx = 0
        if self.__cur_call_player_idx < len(players):
            return players[self.__cur_call_player_idx]
        else:
            return None

    def start_timer_to_publish_player_call_action(self, timeout_seconds):
        self.__timer_for_call = Timer(timeout_seconds, self.publish_default_action_as_player_call)
        self.__timer_for_call.start()

    def publish_default_action_as_player_call(self):
        if self.__pre_call_action:
            self.publish_player_call_action(self.__current_player, self.__pre_call_action)

    def tell_server_my_action(self, action):
        self.get_my_round().make_next_player_select_action(action.get_action_id())

    def get_next_call_action_group(self, action_id):
        return self.get_my_rule().get_follow_up_action_group(action_id)

    def publish_player_call_action(self, player, action):
        for p in self.get_notify_players():
            info = { "info":"player-call" }
            p.send_server_command(info)
        next_player = self.get_next_call_player()
        call_group = self.get_next_call_action_group(action.get_action_id())
        # for p in listen_players:
        self.tell_player_to_select_call_actions(p, call_group)

    def get_notify_players(self):
        return self.get_my_players()