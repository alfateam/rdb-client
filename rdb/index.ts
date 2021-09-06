// @ts-nocheck
import rdb from 'rdb';
import rdbClient from 'rdb-client';

//clients
const clients = rdb.table('client');
clients.primaryColumn('clientMigrationIdentifier').numeric();
clients.column('clientType').string();
clients.column('firstName').string();
clients.column('lastName').string();
clients.column('company').string();
clients.column('companyNumber').string();
clients.column('birthDate').date();

//accounts
const accounts = rdb.table('clientAccount');
accounts.primaryColumn('clientAccountIdentifier').numeric();
accounts.column('migrationStatus').numeric();
accounts.column('actorID').numeric();
accounts.column('clientMigrationIdentifier').numeric();
accounts.column('oldSystemClientReferenceID').numeric();
accounts.column('accountType').numeric();
accounts.column('accountSubType').numeric();
accounts.column('accountStatus').numeric();
accounts.column('anonymousPassageAccount').numeric();
accounts.column('clientBankAccountNumber').string();
accounts.column('countryCodeForClientBankAccounNumber').numeric();
accounts.column('accountDeposit').numeric();
accounts.column('accountBalance').numeric();
accounts.column('tollingBalance').numeric();
accounts.column('lowBalance').numeric();
accounts.column('refillValue').numeric();
accounts.column('creditLimit').numeric();
accounts.column('paymentType').numeric();
accounts.column('externalPaymentType').numeric();
accounts.column('accountReference').string();
accounts.column('accountNumber').numeric();
accounts.column('detailedInvoice').numeric();
accounts.column('isASBAccount').numeric();
accounts.column('createdOn').date();
accounts.column('createdBy').string();
accounts.column('lastUpdatedOn').date();
accounts.column('lastUpdatedBy').string();


//relations clients-accounts
const clientJoin = accounts.join(clients).by('clientMigrationIdentifier').as('client');
clients.hasMany(clientJoin).as('accounts');

//contracts
const contracts = rdb.table('clientContract');
contracts.primaryColumn('clientContractIdentifier').numeric();
contracts.column('migrationStatus').numeric();
contracts.column('actorID').string();
contracts.column('clientMigrationIdentifier').numeric();
contracts.column('clientAccountIdentifier').numeric();
contracts.column('customerContractReference').string();
contracts.column('contractType').numeric();
contracts.column('contractStatus').numeric();
contracts.column('validFrom').date();
contracts.column('validTo').date();
contracts.column('oBUID').numeric();
contracts.column('paidAmountOBUDeposit').numeric();
contracts.column('aSBSeparateAccountID').numeric();
contracts.column('vehicleValidFrom').date();
contracts.column('vehicleValidTo').date();
contracts.column('parkingPermitID').string();
contracts.column('permitValidFrom').date();
contracts.column('permitValidTo').date();
contracts.column('licencePlate').string();
contracts.column('licencePlateCountryID').numeric();
contracts.column('vehicleClassIdentifier').string();
contracts.column('clearingExemptionType').numeric();
contracts.column('vehicleMake').string();
contracts.column('vehicleModel').string();
contracts.column('vehicleLength').numeric();
contracts.column('totalAllowedWeight').numeric();
contracts.column('vehicleYear').string();
contracts.column('vehicleColor').string();
contracts.column('vehicleComment').string();
contracts.column('createdOn').date();
contracts.column('createdBy').string();
contracts.column('lastUpdatedOn').date();
contracts.column('lastUpdatedBy').string();

//relations accounts-contracts
const accountJoin = contracts.join(accounts).by('clientAccountIdentifier').as('account');
accounts.hasMany(accountJoin).as('contracts');

//passages
const passages = rdb.table('etc');
passages.primaryColumn('passingID').numeric();
passages.column('migrationStatus').numeric();
passages.column('actorID').string();
passages.column('projectID').numeric();
passages.column('clientContractIdentifier').numeric();
passages.column('passingStatus').numeric();
passages.column('plazaID').numeric();
passages.column('laneID').numeric();
passages.column('time').date();
passages.column('dST').numeric();
passages.column('signalCode').numeric();
passages.column('oBUID').numeric();
passages.column('licencePlate').string();
passages.column('vehicleClass').numeric();
passages.column('price').numeric();
passages.column('seqValidPayment').numeric();
passages.column('seqEntryDetection').numeric();
passages.column('seqEnforced').numeric();
passages.column('seqLCTransaction').numeric();
passages.column('seqVideoPicture').numeric();
passages.column('passageDataFLag').numeric();
passages.column('signalCodeBitMap').numeric();
passages.column('laneMode').numeric();
passages.column('invoiceID').numeric();


//relations contracts-passages
const contractJoin = passages.join(contracts).by('clientContractIdentifier').as('contract');
contracts.hasMany(contractJoin).as('passages');

const invoices = rdb.table('invoice');
invoices.primaryColumn('invoiceID').numeric();
invoices.column('migrationStatus').string();
invoices.column('actorID').string();
invoices.column('invoiceType').numeric();
invoices.column('invoiceStatus').numeric();
invoices.column('invoiceFlag').numeric();
invoices.column('kID').string();
invoices.column('invoiceNumber').string();
invoices.column('clientMigrationIdentifier').numeric();
invoices.column('clientAccountIdentifier').numeric();
invoices.column('oldSystemClientReferenceID').numeric();
invoices.column('accountReference').string();
invoices.column('amount').numeric();
invoices.column('currencyType').numeric();
invoices.column('currencyAmount').numeric();
invoices.column('currencyExchangeRate').numeric();
invoices.column('paidAmount').numeric();
invoices.column('currencyPaidType').numeric();
invoices.column('currencyPaidAmount').numeric();
invoices.column('paidDate').string();
invoices.column('paymentreference').string();
invoices.column('generationDate').date();
invoices.column('paymentDeadline').date();
invoices.column('periodFrom').date();
invoices.column('periodTo').date();
invoices.column('relatedInvoiceID').numeric();
invoices.column('debtCollectionCompany').string();
invoices.column('licencePlate').string();
invoices.column('licencePlateCountryID').numeric();
invoices.column('createdOn').string();
invoices.column('createdBy').string();
invoices.column('lastUpdatedOn').date();
invoices.column('lastUpdatedBy').string();

//relations invoices-accounts
const accountJoin2 = invoices.join(accounts).by('clientAccountIdentifier').as('account');
accounts.hasMany(accountJoin2).as('invoices');

const invoiceLines = rdb.table('invoiceDetail');
invoiceLines.primaryColumn('invoiceID').numeric();
invoiceLines.primaryColumn('linenumber').numeric();
invoiceLines.column('migrationStatus').numeric();
invoiceLines.column('licencePlate').string();
invoiceLines.column('description').string();
invoiceLines.column('projectID').numeric();
invoiceLines.column('invoiceDetailType').numeric();
invoiceLines.column('amount').numeric();
invoiceLines.column('passingsCount').numeric();
invoiceLines.column('currencyType').numeric();
invoiceLines.column('currencyAmount').numeric();
invoiceLines.column('currencyExchangeRate').numeric();
invoiceLines.column('oBUID').numeric();

//relations invoiceLines-invoices
const invoiceJoin = invoiceLines.join(invoices).by('invoiceID').as('invoice');
invoices.hasMany(invoiceJoin).as('lines');


export default rdbClient({
    tables: {
        clients,
        accounts,
        contracts,
        passages,
        invoices,
        invoiceLines
    }
});