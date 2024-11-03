import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import axios, { all } from 'axios';
import { promises as fs } from 'fs';
import { start } from 'repl';

async function getTopRatedMoviesAtPage(page) {
  let response = await axios.get(
    `https://api.themoviedb.org/3/movie/top_rated?api_key=46f79644eaaccd7f84afe0652dab6604&page=${page}`
  );

  return response.data.results;
}

async function getFirstTopRatedMovies(count) {
  let movies = [];
  let i = 1;
  while (movies.length < count) {
    const tempMovies = await getTopRatedMoviesAtPage(i);
    
    if (movies.length + tempMovies.length > count) {
      const neededMovies = count - movies.length;
      let neededSubarray = tempMovies.slice(0, neededMovies);
      movies.push(...neededSubarray);
    } else {
      movies.push(...tempMovies);
    }
    
    i += 1;
  }

  return movies;
}

async function createChart(ratings, startYear) {
  const yearLength = ratings.length;
  let years = [];
  for (let i = 0; yearLength > years.length; i++) {
    years.push(startYear + i);
  }

  const width = 1000;
  const height = 1000;
  const configuration = {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label: 'Average Rating',
        data: ratings,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
          y: {
              min: 6.0,
              max: 10.0
          }
      }
  },
    plugins: [{
      id: 'background-colour',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }]
  };
  const chartCallback = (ChartJS) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
  };
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  await fs.writeFile('./example.png', buffer, 'base64');

}

async function getAllRatingsPerYear(movies) {
  let startYear = 9999;
  let ratingsPerYear = [];

  for (const movie of movies) {
    const releaseDate = movie.release_date;
    const rating = movie.vote_average;
    const year = new Date(releaseDate).getFullYear();
    
    if (year < 1920) {
      continue;
    }
    
    if (year < startYear) {
      const yearDifference = startYear - year;
      if (startYear !== 9999) {
        for (let i = 0; i < yearDifference - 1; i++) {
          ratingsPerYear.unshift([]);
        }
      }
      ratingsPerYear.unshift([rating]);
      startYear = year;
    } else if (year >= startYear) {
      const latestYear = startYear + ratingsPerYear.length - 1;

      if (year <= latestYear) {
        let index = year - startYear;
        ratingsPerYear[index].push(rating);
      } else {
        const yearDifference = year - latestYear;
        for (let i = 0; i < yearDifference - 1; i++) {
          ratingsPerYear.push([]);
        }
        ratingsPerYear.push([rating]);
      }
    }
  }

  return {
    startYear,
    ratingsPerYear
  }
}

function getAverageRatingsPerYear(allRatingsPerYear) {
  let averageRatings = [];

  for (const ratings of allRatingsPerYear.ratingsPerYear) {
    let sum = 0;
    for (const rating of ratings) {
      sum += rating;
    }

    if (ratings.length === 0) {
      averageRatings.push(0);
    } else {
      const average = sum / ratings.length;
      averageRatings.push(average);
    }
  }

  return {
    startYear: allRatingsPerYear.startYear,
    averageRatings
  };
}

// Test code
const movies = await getFirstTopRatedMovies(5000);
const allRatingsPerYear = await getAllRatingsPerYear(movies);
const averageRatingsPerYear = getAverageRatingsPerYear(allRatingsPerYear);
await createChart(averageRatingsPerYear.averageRatings, averageRatingsPerYear.startYear);
