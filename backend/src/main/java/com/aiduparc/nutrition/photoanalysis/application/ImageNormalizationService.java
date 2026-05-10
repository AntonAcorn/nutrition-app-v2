package com.aiduparc.nutrition.photoanalysis.application;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ImageNormalizationService {

    private static final int MAX_DIMENSION = 1600;
    // Hard cap on declared image dimensions to defeat decompression-bomb uploads
    // (a tiny PNG can declare 50000x50000 and force ImageIO to allocate ~9GB).
    private static final long MAX_DECODE_PIXELS = 50_000_000L; // ~50 megapixels
    private static final float JPEG_QUALITY = 0.82f;

    public NormalizedImage normalize(byte[] originalBytes, String contentType) {
        try {
            assertSafeDimensions(originalBytes);
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(originalBytes));
            if (source == null) {
                return new NormalizedImage(originalBytes, defaultContentType(contentType));
            }

            BufferedImage resized = resizeIfNeeded(source);
            byte[] jpegBytes = encodeJpeg(resized);
            return new NormalizedImage(jpegBytes, "image/jpeg");
        } catch (IOException exception) {
            return new NormalizedImage(originalBytes, defaultContentType(contentType));
        }
    }

    private static void assertSafeDimensions(byte[] bytes) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) return;
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) return;
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                long width = reader.getWidth(0);
                long height = reader.getHeight(0);
                if (width * height > MAX_DECODE_PIXELS) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Image dimensions too large"
                    );
                }
            } finally {
                reader.dispose();
            }
        }
    }

    private BufferedImage resizeIfNeeded(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        int maxSide = Math.max(width, height);

        if (maxSide <= MAX_DIMENSION) {
            return convertToRgb(source);
        }

        double scale = (double) MAX_DIMENSION / maxSide;
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        Image scaled = source.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
        BufferedImage output = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.drawImage(scaled, 0, 0, null);
        graphics.dispose();
        return output;
    }

    private BufferedImage convertToRgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        BufferedImage output = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        graphics.drawImage(source, 0, 0, null);
        graphics.dispose();
        return output;
    }

    private byte[] encodeJpeg(BufferedImage image) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
        ImageWriteParam params = writer.getDefaultWriteParam();
        if (params.canWriteCompressed()) {
            params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(JPEG_QUALITY);
        }

        try (MemoryCacheImageOutputStream imageOutput = new MemoryCacheImageOutputStream(outputStream)) {
            writer.setOutput(imageOutput);
            writer.write(null, new IIOImage(image, null, null), params);
        } finally {
            writer.dispose();
        }

        return outputStream.toByteArray();
    }

    private String defaultContentType(String contentType) {
        return (contentType == null || contentType.isBlank()) ? "image/jpeg" : contentType;
    }

    public record NormalizedImage(byte[] bytes, String contentType) {
    }
}
