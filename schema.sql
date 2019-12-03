DROP TABLE IF EXISTS geo;

CREATE TABLE geo (
   
    search_query VARCHAR,
    formatted_query VARCHAR,
    latitude float,
    longitude float
);

INSERT INTO geo (search_query, formatted_query, latitude, longitude) VALUES ('city','city','22','22');