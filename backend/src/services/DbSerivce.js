const CategoryModel = require('../models/CategoryModel');
const MangaModel = require('../models/MangaModel');
const ChapterModel = require('../models/ChapterModel');
const ImageChapterModel = require('../models/ImageChapterModel');
const HistoryMangaModel = require('../models/HistoryMangaModel');
const Utils = require('../utils/utils');
const UserModel = require('../models/UserModel');
const Settings = require('../config/settings');

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

checkExistMangaByName = async name => {
  return await MangaModel.findOne({ name });
};

checkExistChapterByLink = async link => {
  return await ChapterModel.findOne({ link });
};

updateManga = async (idManga, chapter) => {
  try {
    let manga = await MangaModel.findByIdAndUpdate(
      { _id: idManga },
      { $set: { updated: Date.now(), latestChapter: chapter } },
      { new: true },
      (err, doc) => {
        if (err) {
          return false;
        }
        return true;
      }
    );
  } catch (error) {
    console.log('########## error', error);
  }
};

updateViewManga = async (idManga, view) => {
  try {
    let manga = await MangaModel.findOne({ _id: idManga });
    if (manga) {
      let result = await MangaModel.findByIdAndUpdate(
        { _id: idManga },
        { $set: { viewers: manga.viewers + 1 } },
        { new: true },
        (err, doc) => {
          if (err) {
          }
        }
      );
      return result;
    }
  } catch (error) {
    console.log('########## error', error);
  }
  return null;
};

addListChapter = async (listChapter, idManga) => {
  let listChapterNews = [];
  for (let i = listChapter.length - 1; i >= 0; i--) {
    const chapter = listChapter[i];
    let lastChapter = null;
    let checkExist = await checkExistChapterByLink(chapter.link);
    if (!checkExist) {
      let newChapter = new ChapterModel({
        idmanga: idManga,
        name: chapter.chapter,
        link: chapter.link,
        created: new Date()
      });
      let result = await newChapter.save();
      listChapterNews.push(result);
      lastChapter = result;
      console.log('############ add New Chapter', result);
    }
    if (lastChapter) {
      await updateManga(idManga, lastChapter.name);
    }
  }
  return listChapterNews;
};

addListImage = async (listImage, idChapter) => {
  for (let i = 0; i < listImage.length; i++) {
    const image = listImage[i];
    let newImage = new ImageChapterModel({
      name: image.name,
      link: image.link,
      idchapter: idChapter
    });
    let result = await newImage.save();
  }
};

addNewManga = async (manga, idCate) => {
  let newManga = new MangaModel({
    name: manga.name,
    category: manga.category,
    author: manga.author,
    description: manga.description,
    status: manga.status,
    viewers: 0,
    folowers: 0,
    rating: 0,
    thumbnail: manga.thumbnail,
    link: manga.link,
    latestChapter: idCate
  });
  let result = await newManga.save();
  return await addListChapter(manga.listChapter, result._id);
};

addNewCategory = async listCategory => {
  for (let i = 0; i < listCategory.length; i++) {
    const cate = listCategory[i];
    if (cate.name) {
      let checkExist = await CategoryModel.findOne({ name: cate.name });
      if (!checkExist) {
        let newCate = await new CategoryModel(cate);
        console.log('###### Add new category: ', cate.name);
      }
    }
  }
};

getListChapterByIdManga = async (idManga, page) => {
  return await ChapterModel.find({ idmanga: idManga })
    .sort({ _id: -1 })
    .skip((page - 1) * Settings.PAGE_LIMIT*2)
    .limit(Settings.PAGE_LIMIT*2);
};

getListAllChapterByIdManga = async (idManga, page) => {
  return await ChapterModel.find({ idmanga: idManga }).sort({ _id: -1 });
};

followManga = async (idUser, idManga) => {
  let user = await UserModel.findById({ _id: idUser });
  let listMangaFollow = [];
  try {
    listMangaFollow = JSON.parse(user.listIdMangaFollow);
  } catch (error) {
    listMangaFollow = [];
  }
  listMangaFollow.push(idManga);
  let update = await UserModel.findOneAndUpdate(
    { _id: idUser },
    { $set: { listIdMangaFollow: JSON.stringify(listMangaFollow) } }
  );
  return update ? true : fasle;
};

unfollowManga = async (idUser, idManga) => {
  let user = await UserModel.findById({ _id: idUser });
  let listMangaFollow = [];
  try {
    listMangaFollow = JSON.parse(user.listIdMangaFollow);
  } catch (error) {
    listMangaFollow = [];
  }
  if (listMangaFollow) {
    listMangaFollow = listMangaFollow.filter(item => {
      return item != idManga;
    });
  }

  let update = await UserModel.findOneAndUpdate(
    { _id: idUser },
    { $set: { listIdMangaFollow: JSON.stringify(listMangaFollow) } }
  );
  return update ? true : fasle;
};

getFollowManga = async (idUser, page) => {
  let userData = await UserModel.findOne({ _id: idUser });
  let listIdFollowManga = JSON.parse(userData.listIdMangaFollow);
  listIdFollowManga = listIdFollowManga.reverse();
  listIdFollowManga = listIdFollowManga.slice(
    (page - 1) * Settings.PAGE_LIMIT,
    page * Settings.PAGE_LIMIT
  );
  let listManga = [];
  for (let idManga of listIdFollowManga) {
    let manga = await MangaModel.findOne({ _id: idManga });
    listManga.push(manga);
  }
  return listManga;
};

updateHistoryManga = async (idUser, idManga, idChapter) => {
  let history = await HistoryMangaModel.findOneAndUpdate(
    {
      iduser: idUser,
      idmanga: idManga
    },
    { $set: { idchapter: idChapter, updated: Date.now() } },
    { upsert: true, new: true }
  );
  return await history;
};

getListHistoryManga = async (idUser, page) => {
  let listMangaHistory = [];
  try {
    let listHistory = await HistoryMangaModel.find({ iduser: idUser })
      .sort({ updated: -1 })
      .skip((page - 1) * Settings.PAGE_LIMIT)
      .limit(Settings.PAGE_LIMIT);
    for (let item of listHistory) {
      let manga = await MangaModel.findOne({ _id: item.idmanga });
      let chapter = await ChapterModel.findOne({ _id: item.idchapter });
      manga = Utils.Object.addValueInObject(manga, 'readChapter', chapter);
      listMangaHistory.push(manga);
    }
  } catch (error) {
    console.log(' ########## error', error);
  }

  return listMangaHistory;
};

getMangaById = async idManga => {
  try {
    let manga = await MangaModel.findById({ _id: idManga });
    let listChapter = await ChapterModel.find({ idmanga: idManga });
    let listChapterNews = [];
    for (let chapter of listChapter) {
      let listImage = await ImageChapterModel.find({ idchapter: chapter._id });
      chapter = Utils.Object.addValueInObject(chapter, 'listImage', listImage);
      listChapterNews.push(chapter);
    }
    manga = Utils.Object.addValueInObject(manga, 'listChapter', listChapterNews);
    return manga;
  } catch (error) {
    console.log(' ########## error', error);
  }
  return null;
};

getAllImageByIdChapter = async idChapter => {
  try {
    let listImage = await ImageChapterModel.find({ idchapter: idChapter });
    return listImage;
  } catch (error) {
    console.log(' ########## error', error);
  }
};

getTotalImageOfManga = async idManga => {
  let listChapter = await ChapterModel.find({ idmanga: idManga });
  let totalImage = 0;
  for (let chapter of listChapter) {
    try {
      let count = await ImageChapterModel.find({
        idchapter: chapter._id
      });
      totalImage += count;
    } catch (error) {}
  }
  return totalImage;
};

searchMangaByName = async ( key, page ) => {
  const regex = '.*' + key + '.*';
  let listManga = await MangaModel.find({ name: {  $regex: regex } }).skip((page - 1)* Settings.PAGE_LIMIT).limit(Settings.PAGE_LIMIT);
  return listManga;
}

module.exports = {
  checkExistMangaByName,
  addListChapter,
  addListImage,
  addNewManga,
  addNewCategory,
  getListChapterByIdManga,
  updateManga,
  getListAllChapterByIdManga,
  updateViewManga,
  followManga,
  unfollowManga,
  updateHistoryManga,
  getListHistoryManga,
  getFollowManga,
  getMangaById,
  getAllImageByIdChapter,
  getTotalImageOfManga,
  searchMangaByName
};
