const Crawler = require('crawler');
const Category = require('../models/CategoryModel.js');
const Manga = require('../models/MangaModel.js');
const Chapter = require('../models/ChapterModel');

getAllNodeManga = $ => {
  return $('.items').find('.item');
};
getInfoNodeManga = $ => {
  let name = $.find('figure > figcaption > h3 > a').text();
  let link = $.find('figure > figcaption > h3 > a').prop('href');
  return {
    name,
    link
  };
};

let crawlerDetailChapter = new Crawler({
  maxConnections: 10,
  callback: (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      let $ = res.$;
      let parent = $('#ctl00_divCenter > div > div.reading-detail.box_doc');
      let allNodeImage = $(parent).find('.page-chapter');
      console.log('==================', allNodeImage.length);
      allNodeImage.map((index, item) => {
        let image = $(item)
          .find('img')
          .attr('src');
        console.log('==================', image);
      });
    }
    done();
  }
});

var crawlerListChapterFromManga = new Crawler({
  maxConnections: 10,
  callback: async (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      let $ = res.$;
      let listNodeChapter = $('#nt_listchapter > nav > ul > li');
      listNodeChapter.map(async (index, item) => {
        let name = $(item)
          .find('div.col-xs-5.chapter > a')
          .text();
        let link = $(item)
          .find('div.col-xs-5.chapter > a')
          .attr('href');
        let created = new Date();
        let viewers = $(item)
          .find('div.col-xs-3.text-center.small')
          .text();
        let idmanga = res.options.idmanga;
        if (name && link) {
          try {
            let checkExist = await Chapter.findOne({ link }).then(data => {
              return data === null;
            });

            if (checkExist) {
              let newChapter = new Chapter({
                idmanga,
                name,
                link,
                created,
                viewers
              });
              let result = await newChapter.save();
              console.log('##################### add success chapter', name);
            }
          } catch (error) {
            console.log('##################### error', error);
          }
        }
      });
    }
    done();
  }
});

let crawlerDetailInfoManga = new Crawler({
  maxConnections: 10,
  callback: async (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      let $ = res.$;
      let parent = $('#item-detail');
      let name = $(parent)
        .find('h1')
        .text();
      let author = $(parent)
        .find('div.col-xs-8.col-info > ul > li.author.row > p.col-xs-8')
        .text();
      let status = $(parent)
        .find(
          '#item-detail > div.detail-info > div > div.col-xs-8.col-info > ul > li.status.row > p.col-xs-8'
        )
        .text();
      let category = $(parent)
        .find(
          '#item-detail > div.detail-info > div > div.col-xs-8.col-info > ul > li.kind.row > p.col-xs-8'
        )
        .text();
      let viewers = $(parent)
        .find(
          '#item-detail > div.detail-info > div > div.col-xs-8.col-info > ul > li:nth-child(4) > p.col-xs-8'
        )
        .text();
      let rating = $(parent)
        .find(
          '#item-detail > div.detail-info > div > div.col-xs-8.col-info > div.row.rating > div:nth-child(1) > div'
        )
        .attr('data-rating');
      let flower = $(parent)
        .find(
          '#item-detail > div.detail-info > div > div.col-xs-8.col-info > div.follow > span > b'
        )
        .text();
      let thumbnail = $(parent)
        .find('.col-xs-4.col-image')
        .find('img')
        .attr('src');

      let listNodeChapter = $('#nt_listchapter > nav > ul > li');
      let latestChapter;
      listNodeChapter.map((index, item) => {
        let chapter = $(item)
          .find('div.col-xs-5.chapter > a')
          .text();
        let link = $(item)
          .find('div.col-xs-5.chapter > a')
          .attr('href');
        if (chapter && link) {
          if (!latestChapter) {
            latestChapter = chapter;
            return;
          }
        }
      });
      console.log(
        '==============================================================================',
        res.options.uri
      );
      let link = res.options.uri;
      let newManga = new Manga({
        name,
        category,
        author,
        status,
        viewers,
        flower,
        rating,
        thumbnail,
        link,
        latestChapter
      });
      const result = await newManga.save();
      console.log('################### add success manga', name);
      crawlerListChapterFromManga.queue({uri: link, idmanga: result._id})
     
    }
    done();
  }
});

var crawlerMangaFromCategory = new Crawler({
  maxConnections: 1,
  rateLimit: 500,
  // This will be called for each crawled page
  callback: async function(error, res, done) {
    if (error) {
      console.log(error);
    } else {
      let $ = res.$;
      let totalPage = $(
        '#ctl00_mainContent_ctl01_divPager > ul > li:nth-child(15) > a'
      );
      let allMangaOfPage = await getAllNodeManga($);
      allMangaOfPage.map(async (index, item) => {
        let category = await getInfoNodeManga($(item));

        //Check exist manga ?
        let checkExistManga = await Manga.find({ link: category.link }).then(
          data => {
            return data.length > 0;
          }
        );

        if (!checkExistManga) {
          await crawlerDetailInfoManga.queue({
            uri: category.link,
            category
          });
        }
      });
    }
    done();
  }
});



var crawlerAllCategory = new Crawler({
  maxConnections: 1,
  rateLimit: 1000,
  callback: async (error, res, done) => {
    if (error) {
      console.log(error);
    } else {
      let $ = res.$;
      $(
        '#ctl00_divRight > div.box.darkBox.genres.hidden-sm.hidden-xs.Module.Module-179 > div > ul > li'
      ).map(async (index, item) => {
        let name = $(item)
          .find('a')
          .text();
        let link = $(item)
          .find('a')
          .attr('href');
        let checkExist = await Category.findOne({ link }).then(data => {
          return data != null;
        });
        if (!checkExist) {
          let newCate = new Category({ name, link });
          let result = await newCate.save();
          console.log('Add success Category: ', name);
        }
      });
    }
    done();
  }
});
start = async () => {
  try {
    //Crawler all category from net truyen
    crawlerAllCategory.queue('http://www.nettruyen.com/tim-truyen');
    //Get all categoty from mongoDB
    // let listCategory = await Category.find({});
    // listCategory.map((item, index) => {
    //   crawlerMangaFromCategory.queue(item.link);
    // });
    //Crawler all manga
    crawlerMangaFromCategory.queue('http://www.nettruyen.com/tim-truyen');

    for (let index = 2; index <= 423; index++) {
      crawlerMangaFromCategory.queue(
        'http://www.nettruyen.com/tim-truyen?page=' + index
      );
    }

    // let allManga = await Manga.find({});
    // allManga.map( async (item,index) => {
    //   await crawlerListChapterFromManga.queue({
    //     uri: item.link,
    //     idmanga: item._id
    //   });
    // })
    // crawlerMangaFromCategory.queue('http://www.nettruyen.com/tim-truyen');
    // for (let index = 2; index <= 423; index++) {
    // crawlerMangaFromCategory.queue('http://www.nettruyen.com/tim-truyen?page='+index);
    // }
  } catch (error) {
    console.log('############################ ERROR: ', error);
  }
};

const CrawlerData = {
  start
};

module.exports = CrawlerData;
