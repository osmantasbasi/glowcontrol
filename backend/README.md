
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

## Running the service

```bash
python mqtt_service.py
```

The service will start on port 5000.

## API Endpoints

- `GET /status` - Get the current connection status
- `POST /connect` - Initialize and connect the MQTT client
- `POST /disconnect` - Disconnect and cleanup the MQTT client
- `POST /set-client` - Set the active client ID for topic construction
- `POST /publish` - Publish a message to the MQTT broker
