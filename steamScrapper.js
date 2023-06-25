const { JSDOM } = require("jsdom");
const fs = require("fs");
const os = require("os")

class SteamWorkshopApp{
    constructor(_appID){
        this.appID = _appID
    }

    async getWorkshopItems(_requiredtags = [], _excludedTags = []) {
        var tagStr = ""
        Array.from(_requiredtags).forEach( (tag, ind) => tagStr += `&requiredtags[${ind}]=${tag}`)
        Array.from(_excludedTags).forEach( (tag, ind) => tagStr += `&excludedtags[${ind}]=${tag}`)

        var workshopURL = `https://steamcommunity.com/workshop/browse/?appid=${this.appID}&browsesort=mostrecent${tagStr}&actualsort=mostrecent&days=-1&numperpage=30`

        var startPage = 1
        var endPage = 1
        var done = false

        await await JSDOM.fromURL(workshopURL).then(dom => {
            var pages = [...dom.window.document.querySelectorAll('div.workshopBrowsePagingControls > a')]
            if (pages.length > 0){
                endPage = parseInt(pages[pages.length - 2].textContent.trim())
            }
        }).catch(err => {
            console.log(`Error at Getting Page Count : ${pageURL}`)
            console.log(err)
            itemIDLogger.end()
            done = true
        })

        if(done) return;

        var itemIDLogger = fs.createWriteStream(`${this.appID}_items.txt`, { flags: 'a' })
        var pageRange = this.range(startPage, endPage)

        for(var page of pageRange){
            console.log(`Starting Page : ${page}`)
            var pageURL = workshopURL + `&p=${page}`
            await JSDOM.fromURL(pageURL).then(dom => {
                var items = [...dom.window.document.querySelectorAll('a.ugc')]
                if(items.length == 0){
                    done = true
                }
                items.forEach(x => {
                    var itemID = /\?id=(\d*)/.exec(x.getAttribute('href'))[1]
                    itemIDLogger.write(`${itemID}\n`)
                })
            }).catch(err => {
                console.log(`Error at Page : ${page}, URL : ${pageURL}`)
                console.log(err)
                itemIDLogger.end()
                done = true
            })
            if(!done) console.log(`Done Page : ${page}`)
        }
        if(!done) itemIDLogger.end()
    }

    async getWorkshopItemInfo(itemIDs, startAt = 0, endAt = -1){
        var itemIDLogger = fs.createWriteStream(`${this.appID}_itemsInfo.json`, { flags: 'a' })
        var logger = fs.createWriteStream(`${this.appID}.log`, { flags: 'a' })
        if(endAt < 0) endAt = itemIDs.length

        var done = false

        for(var ind = startAt; ind < itemIDs.length && ind < endAt && !done; ind++){
            var itemID = itemIDs[ind].trim()
            if(itemID == "") break
            var item = {}
            item["ID"] = itemID
            var itemURL = `https://steamcommunity.com/sharedfiles/filedetails/?id=${itemID}`
            item["URL"] = itemURL
            
            console.log(`Starting Item ${ind+1} : ${itemURL}`)
            
            await JSDOM.fromURL(itemURL).then(dom => {
                item["Name"] = dom.window.document.querySelector('div.workshopItemTitle').textContent.trim()

                var tmpRating = /\/(\d)/.exec(dom.window.document.querySelector('div.fileRatingDetails > img').getAttribute('src'))
                item["Rating"] = tmpRating == null ? 0 : parseInt(tmpRating[1])
                var tmpNumRating = /([\d,]*)/.exec(dom.window.document.querySelector('div.ratingSection').textContent.trim())[1]
                item["NumRating"] = tmpNumRating == "" ? 0 : parseInt(tmpNumRating.replaceAll(",", ""))

                var tmpCreatorInfo = dom.window.document.querySelector('div.breadcrumbs :nth-child(5)')
                item["CreatorID"] = /\/(<?[^\/]+)\/my/.exec(tmpCreatorInfo.getAttribute('href'))[1]
                item["CreatorName"] = /(.*)\'s Workshop/.exec(tmpCreatorInfo.textContent.trim())[1]
                item["CreatorURL"] = tmpCreatorInfo.getAttribute('href')
                
                item["Tags"] = dom.window.document.querySelector('div.rightDetailsBlock').textContent.trim()
                
                var tmpItemInfo = [...dom.window.document.querySelectorAll('div.detailsStatRight')]
                item["Size"] = tmpItemInfo[0].textContent
                item["PostedOn"] = tmpItemInfo[1].textContent
                item["UpdatedOn"] = tmpItemInfo.length > 2 ? tmpItemInfo[2].textContent : "Never"

                var tmpDLCInfo = [...dom.window.document.querySelectorAll('div.requiredDLCItem')]
                item["RequiredDLC"] = []
                for(var dlc of tmpDLCInfo){
                    item["RequiredDLC"].push(dlc.textContent.trim())
                }

                var tmpDependenceInfo = [...dom.window.document.querySelectorAll('div.requiredItemsContainer > a')]
                item["DependsOn"] = []
                for(var dependentItem of tmpDependenceInfo){
                    var dependentItemID = /\?id=(\d*)/.exec(dependentItem.getAttribute('href'))[1]
                    var dependentItemName = dependentItem.textContent.trim()
                    item["DependsOn"].push({
                        "ID" : dependentItemID,
                        "Name" : dependentItemName
                    })
                }
                item["Description"] = dom.window.document.querySelector('div.workshopItemDescription').innerHTML
                                            .replace(/<br\s*[\/]?>/gi, "\n")
                                            .replace(/<\/?[^>]+(>|$)/g, "")
                                            .replace(/\n{3,}/g, "\n\n")
                                            .trim()
            }).catch(err => {
                console.log(`Error at Item ${ind + 1} : ${itemURL}`)
                console.log(err)
                logger.write(`Error at Item ${ind + 1} : ${itemURL}\n`)
                itemIDLogger.end()
                logger.end()
                done = true
            })
            if(!done){
                var jsonData = JSON.stringify(item, undefined, 4)
                itemIDLogger.write(`${jsonData},\n`, 'utf-8')
                console.log(`Done Item ${ind + 1}`)
                logger.write(`Done Item ${ind + 1} : ${itemURL}\n`)
            }
        }
        if(!done){
            itemIDLogger.end()
            logger.end()
        }
    }

    range(start, end){
        return [...Array(end - start + 1).keys()].map(i => i + start)
    }
}

// An working example

// var appID = 294100

// var app = new SteamWorkshopApp(appID)

// var optionalTags = ["1.4", "1.3", "1.2", "1.1"] // At least one of these will be present, besides Mod
// var excludedtags = []
// for(var ind = 0; ind < optionalTags.length; ind++){
//     var requiredTags = ["Mod"]
//     requiredTags.push(optionalTags[ind])
//     app.getWorkshopItems(requiredTags, excludedtags)
//     excludedtags.push(optionalTags[ind])
// }

// var items = fs.readFileSync(`${appID}_items.txt`).toString().split('\n')
// app.getWorkshopItemInfo(items)
