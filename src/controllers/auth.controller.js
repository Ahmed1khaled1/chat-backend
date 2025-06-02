import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Error in signup controller:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName, email } = req.body;
    const userId = req.user._id;

    if (!fullName && !email && !profilePic) {
      return res.status(400).json({ message: "All fields are empty" });
    }
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (fullName) updatedUser.fullName = fullName || updatedUser.fullName;
    if (email) updatedUser.email = email || updatedUser.email;

    if (profilePic) {
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updatedUser.profilePic = uploadResponse.secure_url || updatedUser.profilePic;
    }
    await updatedUser.save();
    res.status(200).json({
      success: true,
      data: {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
      },
    });
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const updateUserInfo = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { fullName, email } = req.body;

//     if (!fullName && !email) {
//       return res.status(400).json({ message: "All fields are empty" });
//     }

//     const updatedUser = await User.findById(userId);
//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if(fullName) updatedUser.fullName = fullName || updatedUser.fullName;
//     if (email) updatedUser.email = email || updatedUser.email;

//     await updatedUser.save();
//     res.status(200).json({
//       success: true,
//       data: {
//         fullName: updatedUser.fullName,
//         email: updatedUser.email,
//         profilePic: updatedUser.profilePic,
//       },
//     });
//   } catch (error) {
//     console.log("Error in updateUserInfo controller", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };


export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
