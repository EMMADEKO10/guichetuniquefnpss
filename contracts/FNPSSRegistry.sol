// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FNPSSRegistry
 * @author Equipe Projet Guichet Unique FNPSS (RDC)
 * @notice Registre officiel d'ancrage cryptographique (SHA-256) et de verification instantanee
 *         des actes administratifs delivres par le Fonds National de Promotion et de Service Social (FNPSS).
 * @dev Conforme aux exigences BLK-04, BLK-05, BLK-06 et BLK-07 :
 *      - Aucune donnee personnelle n'est stockee on-chain (uniquement l'empreinte SHA-256 et les metadonnees publiques).
 *      - Compatible Polygon Amoy Testnet (chainId 80002) et Polygon PoS Mainnet (chainId 137).
 *      - Controle d'acces granulaire par roles (ADMIN, REGISTRAR / Relayer, REVOKER, MINISTRY_SIGNER).
 */
contract FNPSSRegistry {
    // ------------------------------------------------------------------------
    // Roles & Etats
    // ------------------------------------------------------------------------
    enum DocStatus {
        NONE,       // 0 : Empreinte inconnue (Document inexistant ou falsifie)
        ACTIVE,     // 1 : Acte authentique et en vigueur
        REVOKED     // 2 : Acte revoque administrativement par le FNPSS ou la Tutelle
    }

    struct DocumentRecord {
        string certificateNumber;   // Ex: "FNPSS-EXO-2026-00124"
        uint8 serviceCode;          // 1 (S1) a 6 (S6)
        uint64 issuedAt;            // Timestamp Unix d'ancrage
        uint64 expiresAt;           // Timestamp Unix d'expiration (0 = validite permanente)
        DocStatus status;           // Statut courant on-chain
        address issuer;             // Adresse du relayer/signataire FNPSS
        address ministryCoSigner;   // Adresse de contre-seing ministeriel (optionnel pour S2/S6)
        uint64 revokedAt;           // Timestamp Unix de revocation (0 si non revoque)
        string revocationReason;    // Motif officiel de revocation
    }

    address public admin;
    bool public paused;

    mapping(address => bool) public isRegistrar;
    mapping(address => bool) public isRevoker;
    mapping(address => bool) public isMinistrySigner;

    // Mapping principal : Hash SHA-256 du PDF officiel -> Enregistrement on-chain
    mapping(bytes32 => DocumentRecord) private _records;
    // Index secondaire : Numero d'acte -> Hash SHA-256 courant
    mapping(bytes32 => bytes32) private _numberToHash;

    uint256 public totalRegistered;
    uint256 public totalRevoked;

    // ------------------------------------------------------------------------
    // Evenements
    // ------------------------------------------------------------------------
    event DocumentRegistered(
        bytes32 indexed docHash,
        string certificateNumber,
        uint8 indexed serviceCode,
        uint64 issuedAt,
        uint64 expiresAt,
        address indexed issuer
    );

    event DocumentCoSigned(
        bytes32 indexed docHash,
        string certificateNumber,
        address indexed ministrySigner,
        uint64 signedAt
    );

    event DocumentRevoked(
        bytes32 indexed docHash,
        string certificateNumber,
        uint64 revokedAt,
        string reason,
        address indexed revokedBy
    );

    event RoleUpdated(string indexed roleName, address indexed account, bool enabled);
    event PauseStateChanged(bool isPaused, address indexed triggeredBy);

    // ------------------------------------------------------------------------
    // Modificateurs
    // ------------------------------------------------------------------------
    modifier onlyAdmin() {
        require(msg.sender == admin, "FNPSSRegistry: caller is not admin");
        _;
    }

    modifier onlyRegistrar() {
        require(isRegistrar[msg.sender] || msg.sender == admin, "FNPSSRegistry: caller is not registrar");
        _;
    }

    modifier onlyRevoker() {
        require(isRevoker[msg.sender] || msg.sender == admin, "FNPSSRegistry: caller is not revoker");
        _;
    }

    modifier onlyMinistry() {
        require(isMinistrySigner[msg.sender] || msg.sender == admin, "FNPSSRegistry: caller is not ministry signer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "FNPSSRegistry: registry is paused");
        _;
    }

    // ------------------------------------------------------------------------
    // Constructeur
    // ------------------------------------------------------------------------
    constructor(address initialAdmin, address initialRelayer) {
        require(initialAdmin != address(0), "FNPSSRegistry: zero admin address");
        admin = initialAdmin;
        isRegistrar[initialAdmin] = true;
        isRevoker[initialAdmin] = true;

        if (initialRelayer != address(0)) {
            isRegistrar[initialRelayer] = true;
            isRevoker[initialRelayer] = true;
        }
    }

    // ------------------------------------------------------------------------
    // Administration des roles et coupe-circuit d'urgence (R10, R11)
    // ------------------------------------------------------------------------
    function setRegistrar(address account, bool enabled) external onlyAdmin {
        isRegistrar[account] = enabled;
        emit RoleUpdated("REGISTRAR", account, enabled);
    }

    function setRevoker(address account, bool enabled) external onlyAdmin {
        isRevoker[account] = enabled;
        emit RoleUpdated("REVOKER", account, enabled);
    }

    function setMinistrySigner(address account, bool enabled) external onlyAdmin {
        isMinistrySigner[account] = enabled;
        emit RoleUpdated("MINISTRY_SIGNER", account, enabled);
    }

    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit PauseStateChanged(_paused, msg.sender);
    }

    // ------------------------------------------------------------------------
    // Fonctions Metiers : Enregistrement, Co-signature et Revocation
    // ------------------------------------------------------------------------

    /**
     * @notice Ancre l'empreinte SHA-256 d'un acte officiel delivre par le FNPSS (BLK-05).
     */
    function registerDocument(
        bytes32 docHash,
        string calldata certificateNumber,
        uint8 serviceCode,
        uint64 expiresAt
    ) external onlyRegistrar whenNotPaused {
        require(docHash != bytes32(0), "FNPSSRegistry: invalid empty hash");
        require(_records[docHash].status == DocStatus.NONE, "FNPSSRegistry: hash already registered");
        require(bytes(certificateNumber).length > 0, "FNPSSRegistry: empty certificate number");
        require(serviceCode >= 1 && serviceCode <= 6, "FNPSSRegistry: serviceCode must be 1..6");
        require(expiresAt == 0 || expiresAt > block.timestamp, "FNPSSRegistry: expiration in the past");

        uint64 nowTs = uint64(block.timestamp);
        _records[docHash] = DocumentRecord({
            certificateNumber: certificateNumber,
            serviceCode: serviceCode,
            issuedAt: nowTs,
            expiresAt: expiresAt,
            status: DocStatus.ACTIVE,
            issuer: msg.sender,
            ministryCoSigner: address(0),
            revokedAt: 0,
            revocationReason: ""
        });

        _numberToHash[keccak256(bytes(certificateNumber))] = docHash;
        totalRegistered += 1;

        emit DocumentRegistered(docHash, certificateNumber, serviceCode, nowTs, expiresAt, msg.sender);
    }

    /**
     * @notice Enregistre le contre-seing ministeriel pour un acte conjoint S2 ou S6 (BLK-06).
     */
    function coSignDocument(bytes32 docHash) external onlyMinistry whenNotPaused {
        DocumentRecord storage rec = _records[docHash];
        require(rec.status == DocStatus.ACTIVE, "FNPSSRegistry: document is not active");
        require(rec.ministryCoSigner == address(0), "FNPSSRegistry: already co-signed");

        rec.ministryCoSigner = msg.sender;
        emit DocumentCoSigned(docHash, rec.certificateNumber, msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice Revoque immediatement et mondialement un acte en cas de fraude ou d'irregularite (BLK-07 / CU06).
     */
    function revokeDocument(
        bytes32 docHash,
        string calldata reason
    ) external onlyRevoker whenNotPaused {
        DocumentRecord storage rec = _records[docHash];
        require(rec.status == DocStatus.ACTIVE, "FNPSSRegistry: document is not active");
        require(bytes(reason).length > 0, "FNPSSRegistry: revocation reason required");

        uint64 nowTs = uint64(block.timestamp);
        rec.status = DocStatus.REVOKED;
        rec.revokedAt = nowTs;
        rec.revocationReason = reason;
        totalRevoked += 1;

        emit DocumentRevoked(docHash, rec.certificateNumber, nowTs, reason, msg.sender);
    }

    // ------------------------------------------------------------------------
    // Fonctions de Verification Publique (Douane DGDA & Tiers - 0 Frais de Gaz)
    // ------------------------------------------------------------------------

    /**
     * @notice Interroge la validite d'un document a partir de son empreinte SHA-256 (VER-03).
     * @return isValid Vrai uniquement si l'acte est ACTIVE et non expire (Pastille Verte).
     * @return isExpired Vrai si l'acte est ACTIVE mais dont la date d'expiration est depassee (Pastille Grise).
     * @return status Statut brut on-chain (NONE=0, ACTIVE=1, REVOKED=2).
     * @return record Structure complete des metadonnees publiques de l'acte.
     */
    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool isValid,
            bool isExpired,
            DocStatus status,
            DocumentRecord memory record
        )
    {
        DocumentRecord memory rec = _records[docHash];
        bool expired = (rec.status == DocStatus.ACTIVE && rec.expiresAt != 0 && block.timestamp > rec.expiresAt);
        bool valid = (rec.status == DocStatus.ACTIVE && !expired);
        return (valid, expired, rec.status, rec);
    }

    /**
     * @notice Recherche l'empreinte SHA-256 associee a un numero d'acte officiel (ex: "FNPSS-EXO-2026-00124").
     */
    function getHashByCertificateNumber(string calldata certificateNumber) external view returns (bytes32) {
        return _numberToHash[keccak256(bytes(certificateNumber))];
    }
}

