const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image } = canvas;

// Initialize face-api models
async function initializeModels() {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk('./models'),
        faceapi.nets.faceLandmark68Net.loadFromDisk('./models'),
        faceapi.nets.faceRecognitionNet.loadFromDisk('./models')
    ]);
}

// Convert base64 to image
function base64ToImage(base64String) {
    const img = new Image();
    img.src = base64String;
    return img;
}

// Compare two face images
async function compareFaces(image1Base64, image2Base64) {
    try {
        // Convert base64 to images
        const img1 = base64ToImage(image1Base64);
        const img2 = base64ToImage(image2Base64);

        // Create canvases
        const canvas1 = Canvas.createCanvas(img1.width, img1.height);
        const canvas2 = Canvas.createCanvas(img2.width, img2.height);

        // Draw images on canvases
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');
        ctx1.drawImage(img1, 0, 0);
        ctx2.drawImage(img2, 0, 0);

        // Detect faces
        const face1 = await faceapi.detectSingleFace(
            canvas1,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        const face2 = await faceapi.detectSingleFace(
            canvas2,
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (!face1 || !face2) {
            return false;
        }

        // Compare face descriptors
        const distance = faceapi.euclideanDistance(
            face1.descriptor,
            face2.descriptor
        );

        // Return true if distance is below threshold
        return distance < 0.6;
    } catch (error) {
        console.error('Face comparison error:', error);
        return false;
    }
}

module.exports = {
    initializeModels,
    compareFaces
}; 