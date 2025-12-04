const AWS = require('aws-sdk');
const { admin } = require('../config/firebaseConfig');

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const compareFaces = async (sourceImage, targetImage) => {
  try {
    const params = {
      SourceImage: {
        Bytes: Buffer.from(sourceImage, 'base64')
      },
      TargetImage: {
        Bytes: Buffer.from(targetImage, 'base64')
      },
      SimilarityThreshold: 90
    };

    const result = await rekognition.compareFaces(params).promise();
    
    return {
      isMatch: result.FaceMatches.length > 0,
      similarity: result.FaceMatches[0]?.Similarity || 0
    };
  } catch (error) {
    console.error('Face comparison error:', error);
    throw new Error('Face comparison failed');
  }
};

const detectFaces = async (image) => {
  try {
    const params = {
      Image: {
        Bytes: Buffer.from(image, 'base64')
      }
    };

    const result = await rekognition.detectFaces(params).promise();
    return result.FaceDetails;
  } catch (error) {
    console.error('Face detection error:', error);
    throw new Error('Face detection failed');
  }
};

module.exports = {
  compareFaces,
  detectFaces
}; 