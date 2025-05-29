module.exports = {
  theme: {
    extend: {
      animation: {
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "50%": { transform: "translateX(5px)" },
          "75%": { transform: "translateX(-5px)" },
        },
      },
    },
  },
};
