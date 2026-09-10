"""
Unit tests for GlucoSense CNN-LSTM Architecture
"""

import unittest
import torch
from ml.model import GlucoSenseCNNLSTM


class TestCNNLSTMModel(unittest.TestCase):

    def setUp(self):
        self.batch_size = 4
        self.seq_len = 24
        self.in_channels = 3
        self.num_classes = 3
        self.model = GlucoSenseCNNLSTM(
            in_channels=self.in_channels,
            seq_length=self.seq_len,
            conv_filters=32,
            lstm_hidden_size=32,
            lstm_num_layers=1,
            num_classes=self.num_classes
        )

    def test_forward_pass_shape(self):
        x = torch.randn(self.batch_size, self.seq_len, self.in_channels)
        logits = self.model(x)
        self.assertEqual(logits.shape, (self.batch_size, self.num_classes))

    def test_predict_proba_simplex(self):
        x = torch.randn(self.batch_size, self.seq_len, self.in_channels)
        probs = self.model.predict_proba(x)
        self.assertEqual(probs.shape, (self.batch_size, self.num_classes))
        # Sum of probabilities across classes must be 1.0
        sums = probs.sum(dim=-1).detach().numpy()
        for s in sums:
            self.assertAlmostEqual(s, 1.0, places=4)
        # All probabilities between 0 and 1
        self.assertTrue(torch.all(probs >= 0.0))
        self.assertTrue(torch.all(probs <= 1.0))

    def test_backward_pass_gradients(self):
        x = torch.randn(self.batch_size, self.seq_len, self.in_channels)
        y = torch.tensor([0, 1, 2, 0], dtype=torch.long)
        criterion = torch.nn.CrossEntropyLoss()
        logits = self.model(x)
        loss = criterion(logits, y)
        loss.backward()

        # Check gradients exist for key layers
        self.assertIsNotNone(self.model.conv1.weight.grad)
        self.assertIsNotNone(self.model.lstm.weight_ih_l0.grad)
        self.assertIsNotNone(self.model.out_linear.weight.grad)


if __name__ == "__main__":
    unittest.main()
