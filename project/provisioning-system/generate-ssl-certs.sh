#!/bin/bash
# Generate self-signed SSL certificates for development
# DO NOT use these certificates in production!

CERT_DIR="./certs"
DAYS=365
COUNTRY="US"
STATE="Local"
CITY="Development"
ORG="Satisfactory Host"
UNIT="IT Department"
COMMON_NAME="frp-manager.local"

echo "Generating self-signed SSL certificates for development..."
echo "Common Name: $COMMON_NAME"
echo "Certificate Directory: $CERT_DIR"

# Create certificates directory
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/server.key" 2048

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=$COMMON_NAME"

# Generate self-signed certificate
openssl x509 -req -days $DAYS -in "$CERT_DIR/server.csr" -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt"

# Set proper permissions
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

# Clean up CSR file
rm "$CERT_DIR/server.csr"

echo "✓ SSL certificates generated successfully!"
echo "  Certificate: $CERT_DIR/server.crt"
echo "  Private Key: $CERT_DIR/server.key"
echo ""
echo "⚠ WARNING: These are self-signed certificates for development only!"
echo "   For production, use certificates from a trusted CA (Let's Encrypt, etc.)"
echo ""
echo "To enable HTTPS:"
echo "1. Set USE_HTTPS=true in your .env file"
echo "2. Update SSL_CERT_PATH and SSL_KEY_PATH if needed"
echo "3. Restart the rathole instance manager"
