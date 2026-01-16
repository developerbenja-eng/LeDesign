# @ledesign/auth

Authentication utilities for the LeDesign platform.

## Overview

Provides JWT token management and password hashing for user authentication.

## Installation

```bash
npm install @ledesign/auth
```

## Usage

### JWT Tokens

```typescript
import { generateToken, verifyToken } from '@ledesign/auth/jwt';

// Generate a token
const token = await generateToken({
  userId: 'user_123',
  email: 'user@example.com',
});

// Verify a token
const payload = await verifyToken(token);
console.log(payload.userId); // 'user_123'
```

### Password Hashing

```typescript
import { hashPassword, comparePassword } from '@ledesign/auth/password';

// Hash a password
const hash = await hashPassword('myPassword123');

// Compare password with hash
const isValid = await comparePassword('myPassword123', hash); // true
const isInvalid = await comparePassword('wrongPassword', hash); // false
```

## Environment Variables

```bash
# Required for JWT signing
JWT_SECRET=your-secret-key-here
```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## License

Proprietary - All rights reserved
