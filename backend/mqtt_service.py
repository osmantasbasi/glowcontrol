import paho.mqtt.client as mqtt
import ssl
import json
import time
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MQTT Configuration
MQTT_CONFIG = {
    "host": "a2c3xy7mb2i4zn-ats.iot.eu-north-1.amazonaws.com",
    "port": 8883,
    "client_id": f"glowcontrol-python-{int(time.time())}",
    "base_topic": os.environ.get("MQTT_BASE_TOPIC", "/client_id/api"),  # Base topic template
}

# Client ID for topic construction
active_client_id = None

# Paths to certificates
CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "certs")
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
    "status": "disconnected"
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
    else:
        print(f"Failed to connect to MQTT broker with result code {rc}")
        mqtt_connected = False
        CONNECTION_STATUS["status"] = "error"

def on_disconnect(client, userdata, rc):
    global mqtt_connected
    print(f"Disconnected from MQTT broker with result code {rc}")
    mqtt_connected = False
    CONNECTION_STATUS["status"] = "disconnected"

def on_publish(client, userdata, mid):
    print(f"Message published: {mid}")

def on_log(client, userdata, level, buf):
    print(f"MQTT Log: {buf}")

# Initialize MQTT client
def init_mqtt_client():
    global mqtt_client, mqtt_connected
    
    try:
        CONNECTION_STATUS["status"] = "connecting"
        
        # Check if certificates exist
        for cert_type, cert_path in CERTIFICATES.items():
            if not os.path.exists(cert_path):
                print(f"Certificate {cert_type} not found at {cert_path}")
                CONNECTION_STATUS["status"] = "error"
                return False
                
        # Create new MQTT client
        mqtt_client = mqtt.Client(client_id=MQTT_CONFIG["client_id"], clean_session=True)
        
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
        print(f"Failed to initialize MQTT client: {str(e)}")
        CONNECTION_STATUS["status"] = "error"
        mqtt_connected = False
        return False

# Publish a message to MQTT
def publish_message(payload):
    if not mqtt_client or not mqtt_connected:
        print("MQTT client not connected")
        return False
    
    try:
        topic = get_publish_topic()
        print(f"Publishing message to topic: {topic}")
        
        result = mqtt_client.publish(
            topic, 
            json.dumps(payload), 
            qos=1
        )
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print("Message published successfully")
            return True
        else:
            print(f"Failed to publish message: {result.rc}")
            return False
    except Exception as e:
        print(f"Error publishing message: {str(e)}")
        return False

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
        print("MQTT client cleaned up")
        return True
    except Exception as e:
        print(f"Error cleaning up MQTT client: {str(e)}")
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
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"]})

@app.route('/disconnect', methods=['POST'])
def disconnect():
    success = cleanup_mqtt_client()
    return jsonify({"success": success, "status": CONNECTION_STATUS["status"]})

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
    
    success = publish_message(data)
    return jsonify({"success": success})

if __name__ == '__main__':
    print(f"Starting MQTT Service on port 5000")
    print(f"MQTT Host: {MQTT_CONFIG['host']}")
    print(f"MQTT Port: {MQTT_CONFIG['port']}")
    print(f"Certificates directory: {CERT_DIR}")
    print(f"CA Cert: {CERTIFICATES['ca_cert']}")
    print(f"Client Cert: {CERTIFICATES['client_cert']}")
    print(f"Client Key: {CERTIFICATES['client_key']}")
    
    # Initialize the MQTT client on startup
    init_mqtt_client()
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
