# Use JDK for compilation, then switch to JRE for runtime
FROM eclipse-temurin:17-jdk-alpine AS builder

# Set working directory
WORKDIR /app

# Copy source files
COPY Cozinha.java .

# Compile the Java source
RUN javac -d build Cozinha.java

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Set working directory
WORKDIR /app

# Copy the compiled Java class files from builder stage
COPY --from=builder /app/build/ ./build/

# Expose port (updated to match the Java service port)
EXPOSE 9000

# Set environment variables
ENV JAVA_OPTS="-Xmx256m -Xms128m"

# Run the Java application
CMD ["java", "-cp", "build", "Cozinha"]
