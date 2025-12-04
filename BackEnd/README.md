# UniMark Attendance System Backend

This is the backend service for the UniMark Attendance System, providing APIs for session management, attendance tracking, and user authentication.

## Features

- User authentication and authorization
- Session management (create, end, view)
- Face recognition-based attendance verification
- Location-based attendance validation
- Real-time attendance tracking
- Attendance history and reporting

## Prerequisites

- Node.js (v14 or higher)
- Firebase Admin SDK credentials
- AWS Rekognition credentials (for face recognition)
- MongoDB (for storing attendance records)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # Firebase Admin SDK
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=your-client-cert-url
   
   # AWS Rekognition
   AWS_REGION=your-aws-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   
   # JWT
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=24h
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/face-image` - Upload face image for recognition
- `GET /api/auth/profile` - Get user profile

### Sessions
- `POST /api/sessions` - Create a new session
- `GET /api/sessions/active` - Get active sessions
- `POST /api/sessions/:sessionId/end` - End a session
- `GET /api/sessions/:sessionId` - Get session details

### Attendance
- `POST /api/attendance/verify` - Verify and mark attendance
- `GET /api/attendance/history` - Get attendance history

## Database Schema

### Users Collection
```javascript
{
  uid: string,
  email: string,
  name: string,
  role: 'student' | 'supervisor',
  prn: string,
  faceImage: string (base64),
  createdAt: timestamp
}
```

### Sessions Collection
```javascript
{
  sessionId: string,
  code: string,
  supervisorId: string,
  expiresAt: timestamp,
  status: 'active' | 'ended',
  attendees: array<{
    userId: string,
    timestamp: timestamp,
    location: {
      latitude: number,
      longitude: number
    },
    verificationMethod: 'face'
  }>
}
```

### Attendance Collection
```javascript
{
  sessionId: string,
  userId: string,
  timestamp: timestamp,
  location: {
    latitude: number,
    longitude: number
  },
  verificationMethod: 'face'
}
```

## Security

- JWT-based authentication
- Role-based access control
- Face recognition verification
- Location-based validation
- Rate limiting
- Input validation

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 