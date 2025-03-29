
# MQTT Backend Service

This backend service handles MQTT communication with TLS for the GlowControl application.

## Setup

1. Create a `certs` directory inside the `backend` folder (if it doesn't exist)
2. Place your certificates in the `certs` directory:
   - `ca-cert.pem`: CA certificate
   - `client-cert.pem`: Client certificate
   - `client-key.pem`: Client private key

## Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

The service can be configured using environment variables:

- `MQTT_HOST`: MQTT broker hostname (default: "a2c3xy7mb2i4zn-ats.iot.eu-north-1.amazonaws.com")
- `MQTT_PORT`: MQTT broker port (default: 8883)
- `MQTT_BASE_TOPIC`: Base topic template (default: "/client_id/api")

## Running the service

```bash
python mqtt_service.py
```

The service will start on port 5000 at 0.0.0.0, accessible from any network interface.

## Certificate File Names

The service expects the following certificate file names:
- `ca-cert.pem` - CA certificate
- `client-cert.pem` - Client certificate 
- `client-key.pem` - Client private key

## Configuring the Frontend

Set the environment variable `VITE_MQTT_BACKEND_URL` to the URL where your backend is running:
- For local development: `http://localhost:5000`
- For production: the URL of your deployed backend service

## API Endpoints

- `GET /` - Service information and available endpoints
- `GET /status` - Get the current connection status
- `POST /connect` - Initialize and connect the MQTT client
- `POST /disconnect` - Disconnect and cleanup the MQTT client
- `POST /set-client` - Set the active client ID for topic construction
- `POST /publish` - Publish a message to the MQTT broker

## Troubleshooting

If you're experiencing connection issues:

1. Check that the backend server is running:
   ```bash
   # You should see output like "Running on http://0.0.0.0:5000"
   python mqtt_service.py
   ```

2. Verify that all certificates are correctly placed in the `certs` directory:
   ```
   backend/certs/
     ├── ca-cert.pem
     ├── client-cert.pem
     └── client-key.pem
   ```

3. Ensure the certificate files have the correct permissions:
   ```bash
   chmod 644 backend/certs/*.pem
   ```

4. If using MQTT over TLS, check that your MQTT broker supports TLS and your certificates are valid:
   ```bash
   openssl verify -CAfile backend/certs/ca-cert.pem backend/certs/client-cert.pem
   ```

5. Confirm that the frontend is using the correct backend URL. Check your `.env` file or environment configuration:
   ```
   VITE_MQTT_BACKEND_URL=http://localhost:5000
   ```

6. Check the backend logs for detailed error messages.
