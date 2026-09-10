"""
GlucoSense: CNN-LSTM Deep Learning Architecture for Multi-Class Diabetes Classification
Reference: "A Unified Deep Learning Framework for Multi-Class Diabetes Classification
and Insulin-Aware Glycemic Risk Assessment Using CGM Data"
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any


class GlucoSenseCNNLSTM(nn.Module):
    """
    Unified CNN-LSTM Deep Learning Neural Network:
    1. Temporal 1D Convolutions: Extracts rapid local dynamics, glycemic spikes,
       slopes, and instantaneous rate of change.
    2. Batch Normalization & Pooling: Stabilizes gradient flows and compresses temporal feature maps.
    3. Bidirectional/Stacked LSTM: Captures sustained diurnal glycemic trends and long-term dependencies.
    4. Multi-Class Classifier Head: Outputs calibrated softmax probabilities for Normal, Prediabetes, and Type 2.
    """

    def __init__(
        self,
        in_channels: int = 3,       # [glucose, rate_of_change, delta_norm]
        seq_length: int = 24,       # 24 steps = 2 hours of 5-min readings
        conv_filters: int = 64,
        conv_kernel_size: int = 3,
        lstm_hidden_size: int = 64,
        lstm_num_layers: int = 2,
        lstm_dropout: float = 0.2,
        dense_units: int = 64,
        dropout_rate: float = 0.3,
        num_classes: int = 3
    ):
        super(GlucoSenseCNNLSTM, self).__init__()

        self.in_channels = in_channels
        self.seq_length = seq_length
        self.conv_filters = conv_filters
        self.lstm_hidden_size = lstm_hidden_size
        self.num_classes = num_classes

        # 1. 1D Convolutional Layers
        self.conv1 = nn.Conv1d(
            in_channels=in_channels,
            out_channels=conv_filters,
            kernel_size=conv_kernel_size,
            padding=conv_kernel_size // 2
        )
        self.bn1 = nn.BatchNorm1d(conv_filters)
        self.relu1 = nn.ReLU()

        self.conv2 = nn.Conv1d(
            in_channels=conv_filters,
            out_channels=conv_filters,
            kernel_size=conv_kernel_size,
            padding=conv_kernel_size // 2
        )
        self.bn2 = nn.BatchNorm1d(conv_filters)
        self.relu2 = nn.ReLU()

        self.pool = nn.MaxPool1d(kernel_size=2)

        # 2. Recurrent LSTM Layers
        self.lstm = nn.LSTM(
            input_size=conv_filters,
            hidden_size=lstm_hidden_size,
            num_layers=lstm_num_layers,
            batch_first=True,
            dropout=lstm_dropout if lstm_num_layers > 1 else 0.0,
            bidirectional=False
        )

        # 3. Dense Classifier Head
        # Concatenate last time-step with global average pooled sequence
        pooled_feat_dim = lstm_hidden_size * 2
        self.fc1 = nn.Linear(pooled_feat_dim, dense_units)
        self.relu_fc = nn.ReLU()
        self.dropout = nn.Dropout(p=dropout_rate)
        self.out_linear = nn.Linear(dense_units, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Input: (B, L, C)
        Output: Logits (B, num_classes)
        """
        # Transpose from (B, L, C) to (B, C, L) for Conv1D
        x = x.transpose(1, 2)

        # 1. Convolutions
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.relu2(self.bn2(self.conv2(x)))
        x = self.pool(x) # (B, conv_filters, L // 2)

        # Transpose back to (B, L_conv, conv_filters) for LSTM
        x = x.transpose(1, 2)

        # 2. LSTM
        lstm_out, (h_n, c_n) = self.lstm(x) # lstm_out: (B, L_conv, lstm_hidden_size)

        # Last step output + Global Average Pooling over time
        last_step = lstm_out[:, -1, :]
        avg_pooled = torch.mean(lstm_out, dim=1)
        combined = torch.cat([last_step, avg_pooled], dim=1) # (B, lstm_hidden_size * 2)

        # 3. Dense Head
        x = self.relu_fc(self.fc1(combined))
        x = self.dropout(x)
        logits = self.out_linear(x)

        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Computes normalized class probabilities (B, num_classes)."""
        logits = self.forward(x)
        return F.softmax(logits, dim=-1)

    def get_architecture_summary(self) -> Dict[str, Any]:
        """Returns structural parameters and parameter count."""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)

        return {
            "model_name": "GlucoSense-CNN-LSTM",
            "in_channels": self.in_channels,
            "seq_length": self.seq_length,
            "conv_filters": self.conv_filters,
            "lstm_hidden_size": self.lstm_hidden_size,
            "num_classes": self.num_classes,
            "total_parameters": total_params,
            "trainable_parameters": trainable_params
        }
