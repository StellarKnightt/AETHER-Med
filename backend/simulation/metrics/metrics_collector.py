"""
Metrics Collector
=================
Aggregates metrics from the simulation components for the dashboard.
"""

from typing import Dict, Any

class MetricsCollector:
    """Collects and aggregates simulation metrics."""

    def __init__(self, stream_engine, bed_manager):
        self.stream_engine = stream_engine
        self.bed_manager = bed_manager

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Aggregate current state into dashboard metrics."""
        
        active_patients = len(self.stream_engine.active_patients)
        bed_stats = self.bed_manager.get_bed_stats()
        
        # Calculate overall occupancy
        total_beds = 0
        occupied_beds = 0
        icu_total = 0
        icu_occupied = 0
        
        for b_type, stats in bed_stats.items():
            t_beds = sum(stats.values())
            o_beds = stats.get("occupied", 0)
            
            total_beds += t_beds
            occupied_beds += o_beds
            
            if b_type == "icu":
                icu_total += t_beds
                icu_occupied += o_beds
                
        occupancy_rate = (occupied_beds / total_beds * 100) if total_beds > 0 else 0
        icu_occupancy_rate = (icu_occupied / icu_total * 100) if icu_total > 0 else 0
        
        return {
            "active_patients": active_patients,
            "overall_occupancy_rate": round(occupancy_rate, 1),
            "icu_occupancy_rate": round(icu_occupancy_rate, 1),
            "bed_stats": bed_stats,
            "is_running": self.stream_engine.is_running,
        }
