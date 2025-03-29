
import paho.mqtt.client as mqtt
import ssl
import json
import time
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('mqtt_service')

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)  # Enable CORS for all routes and all origins

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
        logger.info(f"Connected to MQTT broker with result code {rc}")
        mqtt_connected = True
        CONNECTION_STATUS["status"] = "connected"
        CONNECTION_STATUS["error"] = None
        publish_message("Connected")
        
    else:
        error_msg = f"Failed to connect to MQTT broker with result code {rc}"
        logger.error(error_msg)
        mqtt_connected = False
        CONNECTION_STATUS["status"] = "error"
        CONNECTION_STATUS["error"] = error_msg

def on_disconnect(client, userdata, rc):
    global mqtt_connected
    logger.info(f"Disconnected from MQTT broker with result code {rc}")
    mqtt_connected = False
    CONNECTION_STATUS["status"] = "disconnected"

def on_publish(client, userdata, mid):
    logger.info(f"Message published: {mid}")

def on_log(client, userdata, level, buf):
    logger.debug(f"MQTT Log: {buf}")

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
            logger.error(error_msg)
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
        logger.info(f"Connecting to MQTT broker at {MQTT_CONFIG['host']}:{MQTT_CONFIG['port']}")
        mqtt_client.connect(
            MQTT_CONFIG["host"],
            MQTT_CONFIG["port"],
            keepalive=60
        )
        
        # Start the loop
        mqtt_client.loop_start()
        
        logger.info("MQTT client initialized successfully")
        return True
    except Exception as e:
        error_msg = f"Failed to initialize MQTT client: {str(e)}"
        logger.error(error_msg)
        CONNECTION_STATUS["status"] = "error"
        CONNECTION_STATUS["error"] = error_msg
        mqtt_connected = False
        return False

# Publish a message to MQTT
def publish_message(payload):
    if not mqtt_client or not mqtt_connected:
        error_msg = "MQTT client not connected"
        logger.error(error_msg)
        return False, error_msg
    
    try:
        topic = get_publish_topic()
        logger.info(f"Publishing message to topic: {topic}")
        logger.info(f"Payload: {json.dumps(payload)}")
        
        result = mqtt_client.publish(
            topic, 
            json.dumps(payload), 
            qos=1
        )
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info("Message published successfully")
            return True, None
        else:
            error_msg = f"Failed to publish message: {result.rc}"
            logger.error(error_msg)
            return False, error_msg
    except Exception as e:
        error_msg = f"Error publishing message: {str(e)}"
        logger.error(error_msg)
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
        logger.info("MQTT client cleaned up")
        return True
    except Exception as e:
        error_msg = f"Error cleaning up MQTT client: {str(e)}"
        logger.error(error_msg)
        CONNECTION_STATUS["error"] = error_msg
        return False

# Set active client ID for topic construction
def set_active_client_id(client_id):
    global active_client_id
    active_client_id = client_id
    logger.info(f"Active client ID set to: {client_id}")
    logger.info(f"Publishing topic is now: {get_publish_topic()}")
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
    logger.info("Received connect request")
    success = init_mqtt_client()
    logger.info(f"Connect result: {success}")
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"], "error": CONNECTION_STATUS["error"]})

@app.route('/disconnect', methods=['POST'])
def disconnect():
    logger.info("Received disconnect request")
    success = cleanup_mqtt_client()
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"], "error": CONNECTION_STATUS["error"]})

@app.route('/set-client', methods=['POST'])
def set_client():
    data = request.json
    if not data or not data.get('clientId'):
        logger.error("Missing clientId in request")
        return jsonify({"success": False, "error": "Client ID is required"}), 400
    
    logger.info(f"Setting client ID to: {data.get('clientId')}")
    success = set_active_client_id(data.get('clientId'))
    return jsonify({"success": success, "active_client_id": active_client_id})

@app.route('/publish', methods=['POST'])
def publish():
    data = request.json
    if not data:
        logger.error("Missing payload in request")
        return jsonify({"success": False, "error": "Payload is required"}), 400
    
    logger.info("Received publish request")
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

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "MQTT Bridge"})

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info(f"Starting MQTT Service on port 5000")
    logger.info("=" * 50)
    logger.info(f"MQTT Host: {MQTT_CONFIG['host']}")
    logger.info(f"MQTT Port: {MQTT_CONFIG['port']}")
    logger.info(f"Certificates directory: {CERT_DIR}")
    logger.info(f"CA Cert: {CERTIFICATES['ca_cert']}")
    logger.info(f"Client Cert: {CERTIFICATES['client_cert']}")
    logger.info(f"Client Key: {CERTIFICATES['client_key']}")
    
    # Check certificates before starting
    missing_certs = check_certificates()
    if missing_certs:
        logger.warning("WARNING: Missing or unreadable certificates:")
        for cert in missing_certs:
            logger.warning(f"  - {cert}")
        logger.warning("\nPlease ensure all certificates are in place and readable.")
    
    # Initialize the MQTT client on startup
    init_mqtt_client()
    
    try:
        # Run the Flask app
        logger.info("Starting Flask server on 0.0.0.0:5000")
        app.run(host='0.0.0.0', debug=True, port=5000, use_reloader=False)
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        sys.exit(1)
