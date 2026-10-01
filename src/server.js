//IMPORT PACKAGES
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

//DECLARE VARIABLES
const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(currentDir, ".env") });

const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

//EJS SETUP
app.set("view engine", "ejs");
app.set("views", path.join(currentDir, "views"));
app.use(express.static(path.join(currentDir, "public")));

app.get("/", async (req, res) => {
  const values = [];
  const propertyFilters = [];
  const unitFilters = [];
  const location =
    typeof req.query.location === "string" ? req.query.location.trim() : "";
  const propertyType =
    typeof req.query.propertyType === "string" ? req.query.propertyType : "";
  const maxPrice = Number(req.query.maxPrice);

  if (location) {
    values.push(`%${location}%`);
    propertyFilters.push(
      `CONCAT_WS(' ', p.name, p.address_line, p.city, p.state) ILIKE $${values.length}`,
    );
  }

  const propertyTypes = [
    "apartment",
    "house",
    "duplex",
    "studio",
    "office",
    "shop",
    "warehouse",
    "other",
  ];
  if (propertyTypes.includes(propertyType)) {
    values.push(propertyType);
    propertyFilters.push(`p.property_type = $${values.length}`);
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    values.push(maxPrice);
    unitFilters.push(`rent_amount <= $${values.length}`);
  }

  try {
    const [listingResult, summaryResult] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, p.description, p.property_type, p.address_line,
                p.city, p.state, u.unit_number, u.bedrooms, u.bathrooms,
                u.rent_amount, image.image_url
         FROM properties p
         JOIN LATERAL (
           SELECT unit_number, bedrooms, bathrooms, rent_amount
           FROM units
           WHERE property_id = p.id AND status = 'available'
             ${unitFilters.length ? `AND ${unitFilters.join(" AND ")}` : ""}
           ORDER BY rent_amount ASC
           LIMIT 1
         ) u ON TRUE
         LEFT JOIN LATERAL (
           SELECT image_url, COUNT(*) OVER()::int AS image_count
           FROM property_images
           WHERE property_id = p.id
           ORDER BY is_primary DESC, created_at ASC
           LIMIT 1
         ) image ON TRUE
         WHERE p.is_active = TRUE AND p.is_verified = TRUE
           ${propertyFilters.length ? `AND ${propertyFilters.join(" AND ")}` : ""}
         ORDER BY p.created_at DESC
         LIMIT 6`,
        values,
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(DISTINCT p.id)::int
            FROM properties p JOIN units u ON u.property_id = p.id
            WHERE p.is_active = TRUE AND p.is_verified = TRUE AND u.status = 'available') AS properties,
           (SELECT COUNT(*)::int FROM units WHERE status = 'available') AS units,
           (SELECT COUNT(DISTINCT city)::int FROM properties
            WHERE is_active = TRUE AND is_verified = TRUE) AS locations`,
      ),
    ]);

    res.render("index", {
      title: "Find N' Stay | Find a place that feels like yours",
      listings: listingResult.rows,
      summary: summaryResult.rows[0],
      filters: {
        location,
        propertyType,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : "",
      },
      dataAvailable: true,
    });
  } catch (error) {
    console.error("Unable to load homepage properties:", error.message);
    res.status(200).render("index", {
      title: "Find N' Stay | Find a place that feels like yours",
      listings: [],
      summary: { properties: 0, units: 0, locations: 0 },
      filters: {
        location,
        propertyType,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : "",
      },
      dataAvailable: false,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
