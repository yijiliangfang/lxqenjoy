from GameStages.TellWinner import TellWinner

import InterProtocol
import CardsMaster
from GameRules.WinTester_Majiang import WinTester_Majiang

class TellWinner_Majiang(TellWinner):
    def __init__(self, rule):
        super(TellWinner_Majiang, self).__init__(rule)

    @staticmethod
    def is_ended_in_round(game_round):
        for w in game_round.get_winners():
            if w.get_won_score() > 0:
                return True

    @staticmethod
    def get_cards_group_score(cards, scored_groups):
        print("not implemented: get_cards_group_score")
        return 0

    @staticmethod
    def execute(game_round):

        winner = game_round.get_winners()[0]
        cards = winner.get_in_hand_cards()
        rule = game_round.get_rule()
        pattern = "pi hu"
        P_score = game_round.get_pattern_default_score()
        win_patterns = rule.get_win_patterns()
        for p in win_patterns:
            if p.is_match(cards):
                P_score = p.get_score()
                pattern = p.get_name()
                break  # the highest score will be first tested, one matched, no need to test the lower score patterns

        W_score = 1
        if winner.get_final_cards_is_from_dealer():
            W_score = rule.ScoreRule.get_zimo_score()

        N_score = 0
        if rule.ScoreRule.is_calculate_ting_kou_num():
            good_card_number = 1
            final_cards = winner.get_final_cards()
            #sometimes, the banker is good luck, and when the cards were dealt initially, his cards were well grouped
            #in this case, this is the min good_card_number
            if len(final_cards) == 1:
                final_card = final_cards[0]
                test_cards = cards[:]
                test_cards.remove(final_card)
                wan_s = CardsMaster.def_wans["wan-1"]
                suo_s = CardsMaster.def_suos["suo-1"]
                ton_s = CardsMaster.def_tons["ton-1"]


                testee = [c for c in range(wan_s, wan_s + 9)] + [c for c in range(suo_s, suo_s + 9)] \
                         + [c for c in range(ton_s, ton_s + 9)]
                testee.remove(final_card)
                for c in testee:
                    if WinTester_Majiang.is_card_win_for_cards(c, test_cards):
                        good_card_number += 1
            N_score = rule.ScoreRule.get_ting_kou_score(good_card_number)

        G_score = 0
        if rule.ScoreRule.is_calculate_cards_group():
            G_score = TellWinner_Majiang.get_cards_group_score(cards, rule.ScoreRule.get_scored_groups())

        B_score = rule.ScoreRule.get_base_score()
        final_score = rule.ScoreRule.calculate_score(B=B_score, G=G_score, N=N_score, P=P_score, W = W_score)

        losers = game_round.get_losers()
        win_score = 0
        for l in game_round.get_losers():
            win_score += final_score
            l.set_won_score(-final_score)
        winner.set_won_score(win_score)

        json_packet = InterProtocol.create_winners_losers_json_packet([winner], losers)
        game_round.publish_round_states(json_packet)
