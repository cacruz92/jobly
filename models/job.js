"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
          `SELECT title
           FROM jobs
           WHERE title = $1`,
        [title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
        [
          title,
          salary,
          equity,
          companyHandle,
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll({ title, minSalary, hasEquity } = {}) {
    // set the base query that we will use to search the database
    let baseQuery = 
          `SELECT id,
                title, 
                salary, 
                equity, 
                company_handle AS "companyHandle"
           FROM jobs
           `;
    // set up whereClauses and queryValues arrays to store the WHERE clause values for the SQL request
    let whereClauses = [];
    let queryValues = [];
    
    // if minSalary is not undefined, add the minSalary to the queryValues and then use the length of queryValues to assign the positional placeholder, then store that value in the whereClauses array
    if (minSalary !== undefined) {
      queryValues.push(minSalary);
      whereClauses.push(`salary >= $${queryValues.length}`)
    }

    // if there is a title, add th title to the queryValues and then use the length of queryValues to assign the positional placeholder, then store that value in the whereClauses array
    if(title) {
      // add % so you can see all the titles that include the query value
      queryValues.push(`%${title}%`);
      // add ILIKE for case-insensitive matching
      whereClauses.push(`title ILIKE $${queryValues.length}`)
    }

    if(hasEquity !== undefined){
        if(hasEquity === true){
            whereClauses.push('equity > 0')
        }else if (hasEquity === false){
            whereClauses.push('equity = 0')
        }
        
    }

    if(whereClauses.length > 0 ){
        baseQuery += " WHERE " + whereClauses.join(" AND ");
      }

    //  separate the ORDER BY titele line so that it can remain at the end of the request
    baseQuery += " ORDER BY title"

    const jobsRes = await db.query(baseQuery, queryValues)
    return jobsRes.rows;
  }

  /** Given a job title, return data about job.
   *
   * Returns { title, salary, equity, companyHandle }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
          `SELECT 
          title, 
          salary, 
          equity, 
          company_handle AS "companyHandle"
           FROM jobs
           WHERE title = $1`,
        [title]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(title, data) {
    const { setCols, values } = sqlForPartialUpdate(data);
    const titleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE title = ${titleVarIdx} 
                      RETURNING title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(title) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE title = $1
           RETURNING title`,
        [title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);
  }
}


module.exports = Job;
