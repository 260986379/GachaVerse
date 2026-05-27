const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  // Try service account file first (local dev), then ADC (Cloud Run)
  const saPath = path.join(__dirname, '../../firebase-service-account.json');
  const fs = require('fs');

  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'gachaverse-497204',
    });
  } else {
    // Application Default Credentials (Cloud Run automatically has these)
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'gachaverse-497204',
    });
  }

  return firebaseApp;
}

// Initialise on first require
getFirebaseApp();

module.exports = { admin, getFirebaseApp };
