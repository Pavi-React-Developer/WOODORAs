const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../models/User');
const crypto = require('crypto');

// Common function to handle account linking
const linkOrCreateUser = async (providerName, profile, done) => {
    try {
        let email = '';
        if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value.toLowerCase();
        } else {
            // Some providers might not return email if not requested or private (e.g. GitHub)
            return done(new Error(`Email not provided by ${providerName}. Please check your permissions.`));
        }

        let user = await User.findOne({ email });

        if (user) {
            // Check if provider is already linked
            const isLinked = user.providers.some(p => p.provider === providerName);
            if (!isLinked) {
                user.providers.push({ provider: providerName, providerId: profile.id });
                user.lastLogin = Date.now();
                if (!user.avatar && profile.photos && profile.photos.length > 0) {
                    user.avatar = profile.photos[0].value;
                }
                await user.save();
            } else {
                // Update lastLogin
                user.lastLogin = Date.now();
                await user.save();
            }
        } else {
            // Create new user
            user = await User.create({
                name: profile.displayName || profile.username || 'OAuth User',
                email: email,
                password: crypto.randomBytes(32).toString('hex'), // Secure random password
                providers: [{ provider: providerName, providerId: profile.id }],
                avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                role: 'user',
                lastLogin: Date.now()
            });
        }
        return done(null, user);
    } catch (error) {
        return done(error);
    }
};

// ==========================================
// 1. Google Strategy
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    scope: ['profile', 'email']
}, (accessToken, refreshToken, profile, done) => {
    linkOrCreateUser('google', profile, done);
}));

// ==========================================
// 2. Facebook Strategy
// ==========================================
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'placeholder',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'placeholder',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email']
}, (accessToken, refreshToken, profile, done) => {
    linkOrCreateUser('facebook', profile, done);
}));

// ==========================================
// 3. GitHub Strategy
// ==========================================
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'placeholder',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
    scope: ['user:email']
}, (accessToken, refreshToken, profile, done) => {
    linkOrCreateUser('github', profile, done);
}));

// ==========================================
// 4. Microsoft Strategy
// ==========================================
passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID || 'placeholder',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'placeholder',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`,
    scope: ['user.read']
}, (accessToken, refreshToken, profile, done) => {
    linkOrCreateUser('microsoft', profile, done);
}));

// ==========================================
// 5. Apple Strategy
// ==========================================
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_SERVICE_ID || 'placeholder',
    teamID: process.env.APPLE_TEAM_ID || 'placeholder',
    keyID: process.env.APPLE_KEY_ID || 'placeholder',
    privateKeyString: process.env.APPLE_PRIVATE_KEY || 'placeholder',
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/apple/callback`,
    passReqToCallback: true
}, (req, accessToken, refreshToken, idToken, profile, done) => {
    // Apple sends the user object only on the first login in req.body.user
    if (req.body && req.body.user) {
        try {
            const appleUser = JSON.parse(req.body.user);
            profile.displayName = `${appleUser.name.firstName} ${appleUser.name.lastName}`;
        } catch (e) {
            console.error('Failed to parse Apple user data', e);
        }
    }
    
    // idToken contains the email
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(idToken);
    
    if (!profile.emails) {
        profile.emails = [{ value: decoded.email }];
    }
    
    linkOrCreateUser('apple', profile, done);
}));

// We are not using sessions, so serialize/deserialize are minimal or not needed,
// but included to avoid passport errors.
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
