package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoommateReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface RoommateReportRepository extends JpaRepository<RoommateReport, UUID> {}
