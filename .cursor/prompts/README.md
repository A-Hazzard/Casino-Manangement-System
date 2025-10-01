# Cursor Prompts for Evolution One CMS

**Author:** Aaron Hazzard - Senior Software Engineer  
**Last Updated:** September 25th, 2025

## Overview

This directory contains specialized prompts for Cursor AI to help with specific development tasks in the Evolution One CMS project.

## Available Prompts

### 1. Connection Pooling Optimization
**File:** `connection-pooling-optimization.md`

**Purpose:** Resolve MongoDB timeout issues and optimize database performance

**Key Features:**
- Enhanced connection pool configuration
- Request throttling and queuing
- Database query optimization
- Performance monitoring
- Health checks and error handling

**When to Use:**
- Experiencing timeout errors
- Database performance issues
- High connection usage
- Slow query responses

**Implementation:**
```bash
# Apply the connection pooling optimizations
# This will resolve timeout issues and improve performance
```

### 2. Collection Report System
**File:** `collection-report-system.md` (Future)

**Purpose:** Optimize collection report functionality and data flow

**Key Features:**
- SAS data calculations
- Financial metrics optimization
- Report generation improvements
- Data validation and error handling

### 3. Frontend Performance
**File:** `frontend-performance.md` (Future)

**Purpose:** Optimize React components and user experience

**Key Features:**
- Component optimization
- State management improvements
- Loading state enhancements
- Error boundary implementation

## Usage Instructions

### How to Use Prompts

1. **Open Cursor AI Chat**
2. **Reference the prompt file:**
   ```
   Use the connection pooling optimization prompt from .cursor/prompts/
   ```
3. **Follow the implementation steps**
4. **Monitor results and adjust as needed**

### Best Practices

1. **Read the full prompt** before implementation
2. **Test changes** in development environment
3. **Monitor performance** after implementation
4. **Adjust settings** based on actual usage patterns
5. **Document any customizations** made

### Customization

Each prompt is designed to be:
- **Modular** - Can be applied independently
- **Configurable** - Settings can be adjusted
- **Extensible** - Can be enhanced for specific needs
- **Maintainable** - Clear documentation and examples

## Contributing

When adding new prompts:

1. **Follow the established format**
2. **Include comprehensive documentation**
3. **Provide implementation examples**
4. **Test thoroughly before committing**
5. **Update this README** with new prompts

## Support

For questions about these prompts:
- Check the individual prompt documentation
- Review implementation examples
- Test in development environment
- Consult with the development team

## Version History

- **v1.0** - Initial connection pooling optimization prompt
- **v1.1** - Added monitoring and health checks
- **v1.2** - Enhanced error handling and retry logic
