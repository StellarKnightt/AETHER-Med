"""Graph node functions for the clinical workflow."""

from backend.graph.nodes.triage_node import triage_node
from backend.graph.nodes.pharma_node import pharma_node
from backend.graph.nodes.scheduler_node import scheduler_node
from backend.graph.nodes.bed_node import bed_node
from backend.graph.nodes.sentinel_node import sentinel_node

__all__ = [
    "triage_node",
    "pharma_node",
    "scheduler_node",
    "bed_node",
    "sentinel_node",
]
