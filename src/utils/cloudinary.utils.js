const cloudinary = require("cloudinary").v2


cloudinary.config({
    cloud_name: 'dxsiftfbr',
    api_key: '228367152256416',
    api_secret: 'BoGR8r7pbZG_GGf7DgqDA6YQ8AM'
})

module.exports = cloudinary;
