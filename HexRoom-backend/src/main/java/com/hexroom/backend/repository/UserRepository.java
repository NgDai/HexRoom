package com.hexroom.backend.repository;

import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> lockById(UUID id);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByRole(UserRole role, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("""
            select u from User u
            where (lower(u.email) like lower(concat('%', :q, '%'))
                   or u.phone like concat('%', :q, '%'))
              and u.role = com.hexroom.backend.entity.enums.UserRole.TENANT
            """)
    java.util.List<User> searchTenants(@org.springframework.data.repository.query.Param("q") String q, Pageable pageable);
}
