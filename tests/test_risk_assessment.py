"""
Unit tests for Insulin-Aware Glycemic Risk Assessment Engine
"""

import unittest
from ml.risk_assessment import kovatchev_risk, compute_lbgi_hbgi, assess_glycemic_risk


class TestRiskAssessment(unittest.TestCase):

    def test_kovatchev_risk_symmetric(self):
        # Euglycemic normal setpoint ~112.5 mg/dL should yield near-zero risk
        f_g, rl, rh = kovatchev_risk(112.5)
        self.assertAlmostEqual(f_g, 0.0, places=1)
        self.assertAlmostEqual(rl, 0.0, places=1)
        self.assertAlmostEqual(rh, 0.0, places=1)

        # Hypoglycemic reading (e.g. 50 mg/dL)
        f_low, rl_low, rh_low = kovatchev_risk(50.0)
        self.assertLess(f_low, 0.0)
        self.assertGreater(rl_low, 5.0)
        self.assertEqual(rh_low, 0.0)

        # Hyperglycemic reading (e.g. 280 mg/dL)
        f_high, rl_high, rh_high = kovatchev_risk(280.0)
        self.assertGreater(f_high, 0.0)
        self.assertEqual(rl_high, 0.0)
        self.assertGreater(rh_high, 5.0)

    def test_compute_lbgi_hbgi_profiles(self):
        # Stable normal sequence
        normal_seq = [95, 100, 105, 98, 102, 104, 99, 101]
        stats_norm = compute_lbgi_hbgi(normal_seq)
        self.assertLess(stats_norm["lbgi"], 2.5)
        self.assertLess(stats_norm["hbgi"], 4.5)

        # Severe hypoglycemia sequence
        hypo_seq = [65, 58, 52, 48, 55, 60]
        stats_hypo = compute_lbgi_hbgi(hypo_seq)
        self.assertGreater(stats_hypo["lbgi"], 5.0)

        # Severe hyperglycemia sequence
        hyper_seq = [220, 240, 260, 280, 290, 310]
        stats_hyper = compute_lbgi_hbgi(hyper_seq)
        self.assertGreater(stats_hyper["hbgi"], 9.0)

    def test_insulin_aware_modulation(self):
        readings = [160, 175, 190, 205, 220]
        # Without insulin
        risk_no_insulin = assess_glycemic_risk(readings)
        # With high fasting insulin (resistance flag)
        risk_high_insulin = assess_glycemic_risk(readings, fasting_insulin_uU_ml=35.0)

        self.assertFalse(risk_no_insulin["insulin_aware"])
        self.assertTrue(risk_high_insulin["insulin_aware"])
        self.assertGreater(risk_high_insulin["risk_score"], risk_no_insulin["risk_score"])
        self.assertTrue(any("insulin" in note.lower() for note in risk_high_insulin["clinical_notes"]))


if __name__ == "__main__":
    unittest.main()
