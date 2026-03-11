# Real-Time Systems

This directory contains documentation for real-time communication systems and live data processing capabilities.

## Systems in This Directory

### 📡 MQTT Architecture
**[mqtt-architecture.md](./mqtt-architecture.md)** - MQTT system architecture and design patterns

**Key Components:**
- Publish-subscribe messaging model
- Topic-based message routing
- Quality of service (QoS) levels
- Connection management and security
- Scalability and performance considerations

### 🔧 MQTT Implementation
**[mqtt-implementation.md](./mqtt-implementation.md)** - Detailed MQTT implementation with API endpoints

**Key Endpoints:**
- `GET /api/mqtt/config/subscribe` - SSE subscription endpoint
- `POST /api/mqtt/config/publish` - Message publishing
- `PUT /api/mqtt/config/update` - Configuration updates
- `GET /api/mqtt/status` - Connection status monitoring

### 📋 MQTT Protocols
**[mqtt-protocols.md](./mqtt-protocols.md)** - Message protocols and specifications

**Key Protocols:**
- Machine control commands (LOCK, UNLOCK, RESTART)
- Status update messages
- Configuration synchronization
- Error reporting and alerts
- Heartbeat and health monitoring

## Real-Time Features

### Communication Patterns
- **Publish-Subscribe:** Decoupled message distribution
- **Server-Sent Events:** Frontend real-time updates
- **Callback Routing:** Targeted message delivery
- **Multi-Client Support:** Multiple subscribers per topic

### Machine Integration
- SMIB (Slot Machine Interface Board) communication
- Real-time status monitoring
- Remote control capabilities
- Configuration updates
- Error reporting and diagnostics

### System Architecture
- Scalable message broker implementation
- Connection pooling and management
- Message persistence and reliability
- Security and authentication
- Performance monitoring

## Integration Points

### Business Systems
- Machine status updates
- Collection progress tracking
- Alert system notifications
- Configuration synchronization

### Frontend Integration
- Live dashboard updates
- Real-time chart data
- Status indicator updates
- Notification systems

### Monitoring Systems
- Connection health monitoring
- Message throughput tracking
- Error rate analysis
- Performance metrics

## Security Considerations

### Authentication
- Secure connection establishment
- Token-based authentication
- Message encryption
- Access control and permissions

### Data Protection
- Message payload encryption
- Secure topic namespaces
- Connection isolation
- Audit trail maintenance

## Performance Characteristics

### Scalability
- Horizontal scaling capabilities
- Message throughput optimization
- Connection limit management
- Resource utilization monitoring

### Reliability
- Message persistence
- Delivery guarantees
- Connection recovery
- Fault tolerance mechanisms

## Related Documentation

- **[Frontend MQTT](../../frontend/mqtt-integration.md)** - Frontend real-time integration
- **[Business APIs](../business-apis/)** - Machine control integration
- **[Security Guidelines](../GUIDELINES.md)** - Real-time security standards
- **[Performance Guide](../../../../PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Real-time performance optimization