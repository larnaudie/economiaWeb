import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connectionPromise) return connectionPromise;

    connectionPromise = mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
            console.log("Conectado a MongoDB");
            return mongoose.connection;
        })
        .catch((error) => {
            connectionPromise = null;
            console.error("Error al conectar a MongoDB:", error);
            throw error;
        });

    return connectionPromise;
};

export default connectDB;
