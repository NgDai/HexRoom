# ==============================================================================
# HexRoom Backend - Multi-stage Production Dockerfile
# Stage 1: Build JAR using Maven 3.9 & Eclipse Temurin Java 21 (Alpine)
# Stage 2: Minimal, secure JRE 21 runtime image
# ==============================================================================

# ---- Build Stage ----
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Cache Maven dependencies layer
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN mvn dependency:go-offline -B || true

# Copy source code and build production jar (skip tests for faster deployment)
COPY src ./src
ENV MAVEN_OPTS="-Xmx1024m"
RUN mvn clean package -DskipTests -B

# ---- Runtime Stage ----
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Install curl for container healthcheck & timezone data
RUN apk add --no-cache curl tzdata && \
    cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo "Asia/Ho_Chi_Minh" > /etc/timezone

# Create a dedicated non-root user and media directories
RUN addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p /app/.data/uploads && \
    chown -R spring:spring /app

USER spring:spring

# Copy built artifact from builder stage
COPY --from=builder --chown=spring:spring /app/target/*.jar /app/app.jar

# JVM options optimized for containers (cgroup memory awareness)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Dfile.encoding=UTF-8 -Djava.security.egd=file:/dev/./urandom"
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:8080/v3/api-docs || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
