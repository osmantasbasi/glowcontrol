
import paho.mqtt.client as mqtt
import ssl
import json
import time
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*")  # Enable CORS for all routes and all origins

# MQTT Configuration
MQTT_CONFIG = {
    "host": os.environ.get("MQTT_HOST", "a2c3xy7mb2i4zn-ats.iot.eu-north-1.amazonaws.com"),
    "port": int(os.environ.get("MQTT_PORT", 8883)),
    "client_id": f"glowcontrol-python-{int(time.time())}",
    "base_topic": os.environ.get("MQTT_BASE_TOPIC", "/client_id/api"),  # Base topic template
}

# Client ID for topic construction
active_client_id = None

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Paths to certificates
CERT_DIR = os.path.join(SCRIPT_DIR, "certs")
CERTIFICATES = {
    "client_key": os.path.join(CERT_DIR, "client-key.pem"),
    "client_cert": os.path.join(CERT_DIR, "client-cert.pem"),
    "ca_cert": os.path.join(CERT_DIR, "ca-cert.pem"),
}

# MQTT client instance
mqtt_client = None
mqtt_connected = False

# Connection status
CONNECTION_STATUS = {
    "status": "disconnected",
    "error": None
}

# Get the actual topic to publish to based on active client ID
def get_publish_topic():
    if not active_client_id:
        return MQTT_CONFIG["base_topic"]  # Default if no client ID is set
    return MQTT_CONFIG["base_topic"].replace("client_id", active_client_id)

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    global mqtt_connected
    if rc == 0:
        print(f"Connected to MQTT broker with result code {rc}")
        mqtt_connected = True
        CONNECTION_STATUS["status"] = "connected"
        CONNECTION_STATUS["error"] = None
    else:
        error_msg = f"Failed to connect to MQTT broker with result code {rc}"
        print(error_msg)
        mqtt_connected = False
        CONNECTION_STATUS["status"] = "error"
        CONNECTION_STATUS["error"] = error_msg

def on_disconnect(client, userdata, rc):
    global mqtt_connected
    print(f"Disconnected from MQTT broker with result code {rc}")
    mqtt_connected = False
    CONNECTION_STATUS["status"] = "disconnected"

def on_publish(client, userdata, mid):
    print(f"Message published: {mid}")

def on_log(client, userdata, level, buf):
    print(f"MQTT Log: {buf}")

# Check if certificates exist and are readable
def check_certificates():
    missing_certs = []
    for cert_type, cert_path in CERTIFICATES.items():
        if not os.path.exists(cert_path):
            missing_certs.append(f"{cert_type} at {cert_path}")
        elif not os.access(cert_path, os.R_OK):
            missing_certs.append(f"{cert_type} at {cert_path} (not readable)")
    
    return missing_certs

# Initialize MQTT client
def init_mqtt_client():
    global mqtt_client, mqtt_connected
    
    try:
        CONNECTION_STATUS["status"] = "connecting"
        CONNECTION_STATUS["error"] = None
        
        # Check if certificates exist and are readable
        missing_certs = check_certificates()
        if missing_certs:
            error_msg = f"Missing or unreadable certificates: {', '.join(missing_certs)}"
            print(error_msg)
            CONNECTION_STATUS["status"] = "error"
            CONNECTION_STATUS["error"] = error_msg
            return False
        
        # Create new MQTT client
        mqtt_client = mqtt.Client(client_id=MQTT_CONFIG["client_id"], protocol=mqtt.MQTTv311)
        
        # Set up TLS
        mqtt_client.tls_set(
            ca_certs=CERTIFICATES["ca_cert"],
            certfile=CERTIFICATES["client_cert"],
            keyfile=CERTIFICATES["client_key"],
            cert_reqs=ssl.CERT_REQUIRED,
            tls_version=ssl.PROTOCOL_TLSv1_2
        )
        
        # Set callbacks
        mqtt_client.on_connect = on_connect
        mqtt_client.on_disconnect = on_disconnect
        mqtt_client.on_publish = on_publish
        mqtt_client.on_log = on_log
        
        # Connect to broker
        print(f"Connecting to MQTT broker at {MQTT_CONFIG['host']}:{MQTT_CONFIG['port']}")
        mqtt_client.connect(
            MQTT_CONFIG["host"],
            MQTT_CONFIG["port"],
            keepalive=60
        )
        
        # Start the loop
        mqtt_client.loop_start()
        
        print("MQTT client initialized successfully")
        return True
    except Exception as e:
        error_msg = f"Failed to initialize MQTT client: {str(e)}"
        print(error_msg)
        CONNECTION_STATUS["status"] = "error"
        CONNECTION_STATUS["error"] = error_msg
        mqtt_connected = False
        return False

# Publish a message to MQTT
def publish_message(payload):
    if not mqtt_client or not mqtt_connected:
        error_msg = "MQTT client not connected"
        print(error_msg)
        return False, error_msg
    
    try:
        topic = get_publish_topic()
        print(f"Publishing message to topic: {topic}")
        print(f"Payload: {json.dumps(payload)}")
        
        result = mqtt_client.publish(
            topic, 
            json.dumps(payload), 
            qos=1
        )
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print("Message published successfully")
            return True, None
        else:
            error_msg = f"Failed to publish message: {result.rc}"
            print(error_msg)
            return False, error_msg
    except Exception as e:
        error_msg = f"Error publishing message: {str(e)}"
        print(error_msg)
        return False, error_msg

# Cleanup MQTT connection
def cleanup_mqtt_client():
    global mqtt_client, mqtt_connected
    
    if not mqtt_client:
        return True
    
    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        mqtt_client = None
        mqtt_connected = False
        CONNECTION_STATUS["status"] = "disconnected"
        CONNECTION_STATUS["error"] = None
        print("MQTT client cleaned up")
        return True
    except Exception as e:
        error_msg = f"Error cleaning up MQTT client: {str(e)}"
        print(error_msg)
        CONNECTION_STATUS["error"] = error_msg
        return False

# Set active client ID for topic construction
def set_active_client_id(client_id):
    global active_client_id
    active_client_id = client_id
    print(f"Active client ID set to: {client_id}")
    print(f"Publishing topic is now: {get_publish_topic()}")
    return True

# API Routes
@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": CONNECTION_STATUS["status"],
        "error": CONNECTION_STATUS["error"],
        "connected": mqtt_connected,
        "active_client_id": active_client_id,
        "publish_topic": get_publish_topic() if active_client_id else None,
        "config": {
            "host": MQTT_CONFIG["host"],
            "port": MQTT_CONFIG["port"],
            "base_topic": MQTT_CONFIG["base_topic"]
        }
    })

@app.route('/connect', methods=['POST'])
def connect():
    success = init_mqtt_client()
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"], "error": CONNECTION_STATUS["error"]})

@app.route('/disconnect', methods=['POST'])
def disconnect():
    success = cleanup_mqtt_client()
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"], "error": CONNECTION_STATUS["error"]})

@app.route('/set-client', methods=['POST'])
def set_client():
    data = request.json
    if not data or not data.get('clientId'):
        return jsonify({"success": False, "error": "Client ID is required"}), 400
    
    success = set_active_client_id(data.get('clientId'))
    return jsonify({"success": success, "active_client_id": active_client_id})

@app.route('/publish', methods=['POST'])
def publish():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Payload is required"}), 400
    
    success, error = publish_message(data)
    return jsonify({"success": success, "error": error})

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "service": "MQTT Bridge",
        "status": CONNECTION_STATUS["status"],
        "endpoints": [
            {"method": "GET", "path": "/status", "description": "Get current connection status"},
            {"method": "POST", "path": "/connect", "description": "Connect to MQTT broker"},
            {"method": "POST", "path": "/disconnect", "description": "Disconnect from MQTT broker"},
            {"method": "POST", "path": "/set-client", "description": "Set active client ID"},
            {"method": "POST", "path": "/publish", "description": "Publish message to MQTT broker"}
        ]
    })

if __name__ == '__main__':
    print("=" * 50)
    print(f"Starting MQTT Service on port 5000")
    print("=" * 50)
    print(f"MQTT Host: {MQTT_CONFIG['host']}")
    print(f"MQTT Port: {MQTT_CONFIG['port']}")
    print(f"Certificates directory: {CERT_DIR}")
    print(f"CA Cert: {CERTIFICATES['ca_cert']}")
    print(f"Client Cert: {CERTIFICATES['client_cert']}")
    print(f"Client Key: {CERTIFICATES['client_key']}")
    
    # Check certificates before starting
    missing_certs = check_certificates()
    if missing_certs:
        print("WARNING: Missing or unreadable certificates:")
        for cert in missing_certs:
            print(f"  - {cert}")
        print("\nPlease ensure all certificates are in place and readable.")
    
    # Initialize the MQTT client on startup
    init_mqtt_client()
    
    # Run the Flask app
    app.run(host='0.0.0.0', debug=True, port=5000)
