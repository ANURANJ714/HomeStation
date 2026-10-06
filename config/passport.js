import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import * as userAuthService from "../services/user/authService.js";
import dotenv from "dotenv";

dotenv.config();

const configurePassport = (passport) => {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ email });
          if (!user) {
            return done(null, false, { message: 'No account found with that email.' });
          }

          if (user.status === "Blocked") {
            return done(null, false, { message: "Account is blocked." });
          }

          if (user.authProvider === "google" && !user.passwordHash) {
            return done(null, false, {
              message: "Please continue with Google.",
            });
          }

          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { user, isNewUser } = await userAuthService.handleGoogleAuthUser(profile);
          user.isNewRegistration = isNewUser;
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default configurePassport;