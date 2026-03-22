import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import User from '../Model/User.mjs';
import axios from 'axios'

const router = express.Router();
const client = jwksClient({
  jwksUri: 'https://dev-a2ozvfuacpfd0qu3.us.auth0.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}
router.post('/sync-auth0', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    // 🔑 Call Auth0 userinfo endpoint
    const userInfoRes = await axios.get('https://dev-a2ozvfuacpfd0qu3.us.auth0.com/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const { sub, email, name, nickname, picture } = userInfoRes.data;

    console.log(userInfoRes.data)
    let user = await User.findOneAndUpdate(
      { auth0Id: sub },
      {
        $set: {
          email,
          name,
          username: nickname,
          picture
        }
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ user });
  } catch (err) {
    console.error("❌ Sync error:", err);
    return res.status(500).json({ message: 'Server error syncing user' });
  }
});


export default router;


// domain="dev-a2ozvfuacpfd0qu3.us.auth0.com"
//         clientId="BgRL3fu75uqMY5NDrlPrKnWP2qAAF0A3"