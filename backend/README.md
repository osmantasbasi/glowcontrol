
# MQTT Backend Service

This backend service handles MQTT communication with TLS for the GlowControl application.

## Setup

1. Create a `certs` directory inside the `backend` folder
2. Place your certificates in the `certs` directory:
   - `ca.crt`: CA certificate
   - `client.crt`: Client certificate
   - `client.key`: Client private key

## Installation

```bash
pip install -r requirements.txt
```

## Environment Variables

The service can be configured using environment variables:

- `MQTT_HOST`: MQTT broker hostname (default: "amz.iot.mqtt")
- `MQTT_PORT`: MQTT broker port (default: 8883)
- `MQTT_BASE_TOPIC`: Base topic template (default: "/client_id/api")
- `MQTT_CLIENT_KEY`: Path to client key file (default: "./certs/client.key")
- `MQTT_CLIENT_CERT`: Path to client certificate file (default: "./certs/client.crt")
- `MQTT_CA_CERT`: Path to CA certificate file (default: "./certs/ca.crt")

## Running the service

```bash
python mqtt_service.py
```

The service will start on port 5000. Make sure to have the MQTT certificates in place before starting.

## Configuring the Frontend

Set the environment variable `VITE_MQTT_BACKEND_URL` to the URL where your backend is running. For local development, this would typically be `http://localhost:5000`.

## API Endpoints

- `GET /status` - Get the current connection status
- `POST /connect` - Initialize and connect the MQTT client
- `POST /disconnect` - Disconnect and cleanup the MQTT client
- `POST /set-client` - Set the active client ID for topic construction
- `POST /publish` - Publish a message to the MQTT broker

## Troubleshooting

If you're experiencing connection issues:

1. Verify that all certificates are correctly placed in the `certs` directory
2. Check that the MQTT broker hostname and port are correct
3. Ensure the client has the necessary permissions on the MQTT broker
4. Confirm that the frontend is using the correct backend URL
```
