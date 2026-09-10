"""
GlucoSense: Scalable CNN-LSTM Deep Learning Architecture
Extended, flexible architecture supporting configurable sequence horizons (2h to 24h+),
variable channel counts (e.g. including imputation masks), bidirectional recurrence,
and scalable classification heads while maintaining complete backward compatibility with baseline weights.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any


class GlucoSenseScalableCNNLSTM(nn.Module):
    """
    Scalable Deep Learning Neural Network for CGM Time-Series:
    1. Multi-Channel 1D Convolutions: Extracts acute postprandial spikes, slopes, and sensor features.
    2. Batch Normalization & Max Pooling: Stabilizes deep gradients and condenses sequence dimensionality.
    3. Multi-Layer LSTM: Captures long-range diurnal dynamics, nocturnal stability, and glycemic drift.
    4. Representation Fusion: Merges terminal recurrent hidden state with global temporal average pooling.
    5. Dense Classifier Head: Projects fused sequence embedding to calibrated diagnostic logits.
    """

    def __init__(
        self,
        in_channels: int = 3,           # [glucose, rate_of_change, delta_norm] (+ optional is_imputed)
        seq_length: int = 24,           # 24 steps = 2h; 288 steps = 24h
        conv_filters: int = 64,
        conv_kernel_size: int = 3,
        lstm_hidden_size: int = 64,
        lstm_num_layers: int = 2,
        lstm_dropout: float = 0.2,
        bidirectional: bool = False,
        dense_units: int = 64,
        dropout_rate: float = 0.3,
        num_classes: int = 3
    ):
        super(GlucoSenseScalableCNNLSTM, self).__init__()

        self.in_channels = in_channels
        self.seq_length = seq_length
        self.conv_filters = conv_filters
        self.lstm_hidden_size = lstm_hidden_size
        self.lstm_num_layers = lstm_num_layers
        self.bidirectional = bidirectional
        self.num_classes = num_classes

        # 1. 1D Convolutional Blocks
        self.conv1 = nn.Conv1d(
            in_channels=in_channels,
            out_channels=conv_filters,
            kernel_size=conv_kernel_size,
            padding=conv_kernel_size // 2
        )
        self.bn1 = nn.BatchNorm1d(conv_filters)
        self.act1 = nn.ReLU()

        self.conv2 = nn.Conv1d(
            in_channels=conv_filters,
            out_channels=conv_filters,
            kernel_size=conv_kernel_size,
            padding=conv_kernel_size // 2
        )
        self.bn2 = nn.BatchNorm1d(conv_filters)
        self.act2 = nn.ReLU()

        self.pool = nn.MaxPool1d(kernel_size=2)

        # 2. Recurrent LSTM Sequence Modeling
        self.lstm = nn.LSTM(
            input_size=conv_filters,
            hidden_size=lstm_hidden_size,
            num_layers=lstm_num_layers,
            batch_first=True,
            dropout=lstm_dropout if lstm_num_layers > 1 else 0.0,
            bidirectional=bidirectional
        )

        num_directions = 2 if bidirectional else 1
        lstm_out_dim = lstm_hidden_size * num_directions

        # 3. Dense Classifier Head with Representation Fusion
        # Fuses terminal recurrent state with global average sequence pool
        fused_dim = lstm_out_dim * 2
        self.fc1 = nn.Linear(fused_dim, dense_units)
        self.act_fc = nn.ReLU()
        self.dropout = nn.Dropout(p=dropout_rate)
        self.out_linear = nn.Linear(dense_units, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward Pass:
        x: Tensor of shape (Batch_Size, Sequence_Length, In_Channels)
        Returns: Logits of shape (Batch_Size, Num_Classes)
        """
        # Permute from (B, L, C) to (B, C, L) for 1D convolutions
        x = x.transpose(1, 2)

        # 1. Convolutions & Temporal Pooling
        x = self.act1(self.bn1(self.conv1(x)))
        x = self.act2(self.bn2(self.conv2(x)))
        x = self.pool(x)

        # Transpose back to (B, L_reduced, C_filters) for LSTM
        x = x.transpose(1, 2)

        # 2. Recurrent Sequence Processing
        lstm_out, (h_n, c_n) = self.lstm(x)

        # 3. Dual Representation Fusion
        last_step = lstm_out[:, -1, :]              # (Batch_Size, lstm_out_dim)
        avg_pooled = torch.mean(lstm_out, dim=1)    # (Batch_Size, lstm_out_dim)
        fused = torch.cat([last_step, avg_pooled], dim=1) # (Batch_Size, lstm_out_dim * 2)

        # 4. Dense Classification Projection
        out = self.act_fc(self.fc1(fused))
        out = self.dropout(out)
        logits = self.out_linear(out)

        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Computes calibrated softmax probability simplex (B, num_classes)."""
        logits = self.forward(x)
        return F.softmax(logits, dim=-1)

    def get_architecture_summary(self) -> Dict[str, Any]:
        """Returns structural dimensions and parameter inventory."""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)

        return {
            "model_name": "GlucoSense-Scalable-CNN-LSTM",
            "in_channels": self.in_channels,
            "seq_length": self.seq_length,
            "conv_filters": self.conv_filters,
            "lstm_hidden_size": self.lstm_hidden_size,
            "lstm_num_layers": self.lstm_num_layers,
            "bidirectional": self.bidirectional,
            "num_classes": self.num_classes,
            "total_parameters": total_params,
            "trainable_parameters": trainable_params
        }
