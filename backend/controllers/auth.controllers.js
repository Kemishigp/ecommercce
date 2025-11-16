export const signup = async (req, res) => {
    const {email, password, username} = req.body;
  res.send("Signup Route");
};

export const login = async (req, res) => {
  res.send("Login Route");
};

export const logout = async (req, res) => {
  res.send("Logout Route");
};  