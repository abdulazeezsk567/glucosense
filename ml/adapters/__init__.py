"""
GlucoSense: Dataset Adapters Package
Provides modular ingestion adapters for diverse continuous glucose monitoring (CGM) cohorts.
"""

from ml.adapters.base_adapter import CGMDatasetAdapter, CohortData, Episode
from ml.adapters.hall_adapter import HallDatasetAdapter
from ml.adapters.generic_cgm_adapter import GenericCGMAdapter

__all__ = [
    "CGMDatasetAdapter",
    "CohortData",
    "Episode",
    "HallDatasetAdapter",
    "GenericCGMAdapter"
]
