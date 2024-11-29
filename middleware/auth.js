const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Get token from header
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        if (req.user.status === 'suspended') {
            return res.status(403).json({ msg: 'Your account is suspended. Contact admin.' });
        }
        if (req.user.status === 'pending') {
            return res.status(403).json({ msg: 'Your account is pending approval. Please wait for admin approval.' });
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};