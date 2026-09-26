// context.firebaseUid lets schemas tie a value to the caller — imageSource uses
// it to accept only Storage files in the caller's own folder.
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    context: { firebaseUid: req.user?.firebase_uid },
  });
  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ message: messages });
  }
  next();
};

module.exports = { validate };
