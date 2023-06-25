// Some mods require you to login to steam. For those, copy the below code and paste it into the browser console of the mod workshop page. It will copy the JSON data to clipboard.

var item = {}

var itemID = /\?id\=(\d*)/.exec(document.querySelector('a.sectionTab.active').getAttribute('href'))[1]

item["ID"] = itemID
var itemURL = `https://steamcommunity.com/sharedfiles/filedetails/?id=${itemID}`
item["URL"] = itemURL

item["Name"] = document.querySelector('div.workshopItemTitle').textContent.trim()

var tmpRating = /\/(\d)/.exec(document.querySelector('div.fileRatingDetails > img').getAttribute('src'))
item["Rating"] = tmpRating == null ? 0 : parseInt(tmpRating[1])
var tmpNumRating = /([\d,]*)/.exec(document.querySelector('div.ratingSection').textContent.trim())[1]
item["NumRating"] = tmpNumRating == "" ? 0 : parseInt(tmpNumRating.replaceAll(",", ""))

var tmpCreatorInfo = document.querySelector('div.breadcrumbs :nth-child(5)')
item["CreatorID"] = /\/(<?[^\/]+)\/my/.exec(tmpCreatorInfo.getAttribute('href'))[1]
item["CreatorName"] = /(.*)\'s Workshop/.exec(tmpCreatorInfo.textContent.trim())[1]
item["CreatorURL"] = tmpCreatorInfo.getAttribute('href')

item["Tags"] = document.querySelector('div.rightDetailsBlock').textContent.trim()

var tmpItemInfo = [...document.querySelectorAll('div.detailsStatRight')]
item["Size"] = tmpItemInfo[0].textContent
item["PostedOn"] = tmpItemInfo[1].textContent
item["UpdatedOn"] = tmpItemInfo.length > 2 ? tmpItemInfo[2].textContent : "Never"

var tmpDLCInfo = [...document.querySelectorAll('div.requiredDLCItem')]
item["RequiredDLC"] = []
for(var dlc of tmpDLCInfo){
    item["RequiredDLC"].push(dlc.textContent.trim())
}

var tmpDependenceInfo = [...document.querySelectorAll('div.requiredItemsContainer > a')]
item["DependsOn"] = []
for(var dependentItem of tmpDependenceInfo){
    var dependentItemID = /\?id=(\d*)/.exec(dependentItem.getAttribute('href'))[1]
    var dependentItemName = dependentItem.textContent.trim()
    item["DependsOn"].push({
        "ID" : dependentItemID,
        "Name" : dependentItemName
    })
}
item["Description"] = document.querySelector('div.workshopItemDescription').innerHTML
                            .replace(/<br\s*[\/]?>/gi, "\n")
                            .replace(/<\/?[^>]+(>|$)/g, "")
                            .replace(/\n{3,}/g, "\n\n")
                            .trim()

var jsonData = JSON.stringify(item, undefined, 4) + ", \n"

copy(jsonData)