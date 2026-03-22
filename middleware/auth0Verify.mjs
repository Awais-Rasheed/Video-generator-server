// /middleware/auth0Verify.js
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://dev-a2ozvfuacpfd0qu3.us.auth0.com/.well-known/jwks.json',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export const auth0Middleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  jwt.verify(token, getKey, {
    audience: 'https://video-generator-api',
    issuer: `https://dev-a2ozvfuacpfd0qu3.us.auth0.com/`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });

    req.auth0User = decoded; // email, sub, name, etc.
    next();
  });
};


// domain="dev-a2ozvfuacpfd0qu3.us.auth0.com"
//         clientId="BgRL3fu75uqMY5NDrlPrKnWP2qAAF0A3"