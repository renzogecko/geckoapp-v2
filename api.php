<?php
session_start();

$isLocal = (
    isset($_SERVER['REMOTE_ADDR']) && in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']) ||
    isset($_SERVER['HTTP_HOST']) && in_array($_SERVER['HTTP_HOST'], ['127.0.0.1:5500', 'localhost', 'localhost:5500'])
);

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: https://geckoestudio.ar");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_config.php';

$endpoint = $_GET['endpoint'] ?? '';
$method   = $_SERVER['REQUEST_METHOD'];
$body     = json_decode(file_get_contents('php://input'), true) ?? [];

function responder($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function error($msg, $code = 400) {
    http_response_code($code);
    responder(["success" => false, "message" => $msg]);
}

function presupuesto_metadata($d) {
    $columnas = ['id','cliente','fecha','total','status','sena','estado_ot','items','metodo_pago','metadata'];
    $meta = [];
    foreach ($d as $k => $v) {
        if (!in_array($k, $columnas, true)) $meta[$k] = $v;
    }
    return json_encode($meta, JSON_UNESCAPED_UNICODE);
}

try {
    // ══════════════════════════════════════════
    // AUTH — no requiere sesión activa
    // ══════════════════════════════════════════
    if ($endpoint === 'auth') {

        if ($method === 'GET') {
            if (!empty($_SESSION['gecko_user_id'])) {
                responder(['logueado' => true, 'nombre' => $_SESSION['gecko_nombre'],
                           'rol' => $_SESSION['gecko_rol'], 'email' => $_SESSION['gecko_email']]);
            }
            responder(['logueado' => false]);
        }

        if ($method === 'POST') {
            $email    = trim($body['email'] ?? '');
            $password = $body['password'] ?? '';
            if (!$email || !$password) { error('Datos incompletos', 400); }

            $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) { error('Credenciales inválidas', 401); }

            $valido = password_verify($password, $user['password'])
                   || $user['password'] === $password;

            if (!$valido) { error('Credenciales inválidas', 401); }

            if ($user['password'] === $password) {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?")->execute([$hash, $user['id']]);
            }

            session_regenerate_id(true);
            $_SESSION['gecko_user_id'] = $user['id'];
            $_SESSION['gecko_nombre']  = $user['nombre'];
            $_SESSION['gecko_rol']     = $user['rol'];
            $_SESSION['gecko_email']   = $user['email'];

            responder(['logueado' => true, 'nombre' => $user['nombre'],
                       'rol' => $user['rol'], 'email' => $user['email']]);
        }

        if ($method === 'PUT') {
            if (empty($_SESSION['gecko_user_id'])) {
                error('No autenticado', 401);
            }
            $actual = $body['actual'] ?? '';
            $nueva = $body['nueva'] ?? '';
            if (!$actual || !$nueva) { error('Datos incompletos', 400); }
            if (strlen($nueva) < 4) { error('La nueva contraseña es muy corta', 400); }

            $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE id = ? LIMIT 1");
            $stmt->execute([$_SESSION['gecko_user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) { error('Usuario no encontrado', 404); }

            $valido = password_verify($actual, $user['password']) || $user['password'] === $actual;
            if (!$valido) { error('La contraseña actual no es correcta', 401); }

            $hash = password_hash($nueva, PASSWORD_DEFAULT);
            $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?")->execute([$hash, $user['id']]);

            responder(['success' => true, 'message' => 'Contraseña actualizada']);
        }

        if ($method === 'DELETE') {
            session_destroy();
            responder(['logueado' => false]);
        }

        error('Método no permitido', 405);
    }

    // ══════════════════════════════════════════
    // VERIFICAR SESIÓN para todos los demás endpoints
    // ══════════════════════════════════════════
    if (!$isLocal && empty($_SESSION['gecko_user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autenticado']);
        exit();
    }

    // ══════════════════════════════════════════
    // MATERIALES
    // ══════════════════════════════════════════
    if ($endpoint === 'materiales') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM materiales ORDER BY nombre ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            responder($rows);
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO materiales
                (id, nombre, categoria, subcategoria, stock, multiplicador, costoUSD, costoARS,
                 unidad, unidadVenta, incluyeIva, estrategiaVenta, costo, contenidoUnidad,
                 ancho, largo, espesor, precioCorteMl, nota, multGremio, precioGremio,
                 precioVenta, tieneParametrosCorte, corteSpeed, cortePower, watts, densidad, lumenes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['nombre'] ?? '', $d['categoria'] ?? '',
                $d['subcategoria'] ?? null, $d['stock'] ?? 0, $d['multiplicador'] ?? 2.0,
                $d['costoUSD'] ?? 0, $d['costoARS'] ?? 0, $d['unidad'] ?? 'unidad',
                $d['unidadVenta'] ?? 'unidad', $d['incluyeIva'] ? 1 : 0,
                $d['estrategiaVenta'] ?? 'dinamica', $d['costo'] ?? 0,
                $d['contenidoUnidad'] ?? 1, $d['ancho'] ?? null, $d['largo'] ?? null,
                $d['espesor'] ?? null, $d['cortePrecioML'] ?? $d['precioCorteMl'] ?? null,
                $d['nota'] ?? null, $d['multGremio'] ?? 1.5, $d['precioGremio'] ?? 0,
                $d['precioVenta'] ?? 0,
                $d['tieneParametrosCorte'] ? 1 : 0,
                $d['corteSpeed'] ?? null, $d['cortePower'] ?? null,
                $d['watts'] ?? null,
                $d['densidad'] ?? null,
                $d['lumenes'] ?? null
            ]);
            responder(["success" => true, "message" => "Material creado."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $stmt = $pdo->prepare("REPLACE INTO materiales
                (id, nombre, categoria, subcategoria, stock, multiplicador, costoUSD, costoARS,
                 unidad, unidadVenta, incluyeIva, estrategiaVenta, costo, contenidoUnidad,
                 ancho, largo, espesor, precioCorteMl, nota, multGremio, precioGremio,
                 precioVenta, tieneParametrosCorte, corteSpeed, cortePower, watts, densidad, lumenes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['nombre'] ?? '', $d['categoria'] ?? '',
                $d['subcategoria'] ?? null, $d['stock'] ?? 0, $d['multiplicador'] ?? 2.0,
                $d['costoUSD'] ?? 0, $d['costoARS'] ?? 0, $d['unidad'] ?? 'unidad',
                $d['unidadVenta'] ?? 'unidad', $d['incluyeIva'] ? 1 : 0,
                $d['estrategiaVenta'] ?? 'dinamica', $d['costo'] ?? 0,
                $d['contenidoUnidad'] ?? 1, $d['ancho'] ?? null, $d['largo'] ?? null,
                $d['espesor'] ?? null, $d['cortePrecioML'] ?? $d['precioCorteMl'] ?? null,
                $d['nota'] ?? null, $d['multGremio'] ?? 1.5, $d['precioGremio'] ?? 0,
                $d['precioVenta'] ?? 0,
                $d['tieneParametrosCorte'] ? 1 : 0,
                $d['corteSpeed'] ?? null, $d['cortePower'] ?? null,
                $d['watts'] ?? null,
                $d['densidad'] ?? null,
                $d['lumenes'] ?? null
            ]);
            responder(["success" => true, "message" => "Material actualizado."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM materiales WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Material eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // SERVICIOS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'servicios') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM servicios ORDER BY nombre ASC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO servicios (id, nombre, categoria, costo, unidad, precio)
                VALUES (?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['nombre'] ?? '',
                $d['categoria'] ?? 'mano_obra', $d['costo'] ?? 0,
                $d['unidad'] ?? 'unidad', $d['precio'] ?? 0
            ]);
            responder(["success" => true, "message" => "Servicio creado."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $stmt = $pdo->prepare("REPLACE INTO servicios (id, nombre, categoria, costo, unidad, precio)
                VALUES (?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['nombre'] ?? '',
                $d['categoria'] ?? 'mano_obra', $d['costo'] ?? 0,
                $d['unidad'] ?? 'unidad', $d['precio'] ?? 0
            ]);
            responder(["success" => true, "message" => "Servicio actualizado."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM servicios WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Servicio eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // CLIENTES
    // ══════════════════════════════════════════
    elseif ($endpoint === 'clientes') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM clientes ORDER BY nombre ASC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($method === 'POST') {
            $d = $body;
            $cuits = isset($d['cuits']) ? (is_array($d['cuits']) ? json_encode($d['cuits']) : $d['cuits']) : '[]';
            $emails = isset($d['emails']) ? (is_array($d['emails']) ? json_encode($d['emails']) : $d['emails']) : '[]';
            $telefonos = isset($d['telefonos']) ? (is_array($d['telefonos']) ? json_encode($d['telefonos']) : $d['telefonos']) : '[]';
            $stmt = $pdo->prepare("INSERT INTO clientes (id, nombre, cuit, tel, email, dir, loc, rubro, cuits, emails, telefonos)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['nombre'] ?? '', $d['cuit'] ?? '',
                $d['tel'] ?? '', $d['email'] ?? '', $d['dir'] ?? '',
                $d['loc'] ?? '', $d['rubro'] ?? '',
                $cuits, $emails, $telefonos
            ]);
            responder(["success" => true, "message" => "Cliente creado."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $cuits = isset($d['cuits']) ? (is_array($d['cuits']) ? json_encode($d['cuits']) : $d['cuits']) : '[]';
            $emails = isset($d['emails']) ? (is_array($d['emails']) ? json_encode($d['emails']) : $d['emails']) : '[]';
            $telefonos = isset($d['telefonos']) ? (is_array($d['telefonos']) ? json_encode($d['telefonos']) : $d['telefonos']) : '[]';
            $stmt = $pdo->prepare("REPLACE INTO clientes (id, nombre, cuit, tel, email, dir, loc, rubro, cuits, emails, telefonos)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['nombre'] ?? '', $d['cuit'] ?? '',
                $d['tel'] ?? '', $d['email'] ?? '', $d['dir'] ?? '',
                $d['loc'] ?? '', $d['rubro'] ?? '',
                $cuits, $emails, $telefonos
            ]);
            responder(["success" => true, "message" => "Cliente actualizado."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM clientes WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Cliente eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // PRESUPUESTOS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'presupuestos') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM presupuestos ORDER BY id DESC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) {
                $r['items'] = json_decode($r['items'] ?? '[]', true) ?: [];
                if (!empty($r['metadata'])) {
                    $meta = json_decode($r['metadata'], true);
                    if (is_array($meta)) {
                        foreach ($meta as $mk => $mv) { $r[$mk] = $mv; }
                    }
                }
                unset($r['metadata']);
            }
            unset($r);
            responder($rows);
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO presupuestos
                (id, cliente, fecha, total, status, sena, estado_ot, items, metodo_pago, metadata)
                VALUES (?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['cliente'] ?? '', $d['fecha'] ?? '',
                $d['total'] ?? 0, $d['status'] ?? 'Presupuesto',
                $d['sena'] ?? 0, $d['estado_ot'] ?? '',
                json_encode($d['items'] ?? []), $d['metodo_pago'] ?? '',
                presupuesto_metadata($d)
            ]);
            responder(["success" => true, "message" => "Presupuesto creado."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $stmt = $pdo->prepare("REPLACE INTO presupuestos
                (id, cliente, fecha, total, status, sena, estado_ot, items, metodo_pago, metadata)
                VALUES (?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['cliente'] ?? '', $d['fecha'] ?? '',
                $d['total'] ?? 0, $d['status'] ?? 'Presupuesto',
                $d['sena'] ?? 0, $d['estado_ot'] ?? '',
                json_encode($d['items'] ?? []), $d['metodo_pago'] ?? '',
                presupuesto_metadata($d)
            ]);
            responder(["success" => true, "message" => "Presupuesto actualizado."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM presupuestos WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Presupuesto eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // CAJAS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'cajas') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM cajas ORDER BY nombre ASC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO cajas (id, nombre, saldo, icono) VALUES (?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['nombre'] ?? '',
                $d['saldo'] ?? 0, $d['icono'] ?? 'efectivo'
            ]);
            responder(["success" => true, "message" => "Caja creada."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $stmt = $pdo->prepare("REPLACE INTO cajas (id, nombre, saldo, icono) VALUES (?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['nombre'] ?? '',
                $d['saldo'] ?? 0, $d['icono'] ?? 'efectivo'
            ]);
            responder(["success" => true, "message" => "Caja actualizada."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM cajas WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Caja eliminada."]);
        }
    }

    // ══════════════════════════════════════════
    // GASTOS FIJOS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'gastos_fijos') {

        if ($method === 'GET') {
            $pdo->query("CREATE TABLE IF NOT EXISTS gastos_fijos (
                id VARCHAR(64) PRIMARY KEY,
                concepto VARCHAR(255) NOT NULL,
                monto DECIMAL(15,2) DEFAULT 0,
                vencimiento VARCHAR(10) DEFAULT '',
                estado VARCHAR(50) DEFAULT 'Pendiente',
                categoria VARCHAR(100) DEFAULT NULL
            )");
            $stmt = $pdo->query("SELECT * FROM gastos_fijos ORDER BY concepto ASC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC)); exit;
        }

        if ($method === 'POST') {
            $b = json_decode(file_get_contents('php://input'), true);
            $id = $b['id'] ?? uniqid('gf_');
            $stmt = $pdo->prepare("INSERT INTO gastos_fijos (id, concepto, monto, vencimiento, estado, categoria) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$id, $b['concepto'] ?? '', $b['monto'] ?? 0, $b['vencimiento'] ?? '1', $b['estado'] ?? 'Pendiente', $b['categoria'] ?? null]);
            echo json_encode(['success'=>true,'id'=>$id]); exit;
        }

        if ($method === 'PUT') {
            $b = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("REPLACE INTO gastos_fijos (id, concepto, monto, vencimiento, estado, categoria) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$b['id'], $b['concepto'] ?? '', $b['monto'] ?? 0, $b['vencimiento'] ?? '1', $b['estado'] ?? 'Pendiente', $b['categoria'] ?? null]);
            echo json_encode(['success'=>true]); exit;
        }

        if ($method === 'DELETE') {
            $b = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("DELETE FROM gastos_fijos WHERE id=?");
            $stmt->execute([$b['id']]);
            echo json_encode(['success'=>true]); exit;
        }
    }

    // ══════════════════════════════════════════
    // MOVIMIENTOS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'movimientos') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM movimientos ORDER BY id DESC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO movimientos (id, fecha, detalle, caja, tipo, monto, categoria)
                VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['fecha'] ?? date('d/m/Y'),
                $d['detalle'] ?? '', $d['caja'] ?? '',
                $d['tipo'] ?? 'Ingreso', $d['monto'] ?? 0,
                $d['categoria'] ?? 'Varios'
            ]);
            responder(["success" => true, "message" => "Movimiento registrado."]);
        }

        if ($method === 'DELETE') {
            $id = $body['id'] ?? null;
            if (!$id) error("ID requerido.");
            $stmt = $pdo->prepare("DELETE FROM movimientos WHERE id = ?");
            $stmt->execute([$id]);
            responder(["success" => true, "message" => "Movimiento eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // LASER PARAMS
    // ══════════════════════════════════════════
    elseif ($endpoint === 'laser_params') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT valor FROM configuracion WHERE clave = 'gecko_laserParams'");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                responder(json_decode($row['valor'], true) ?: new stdClass());
            }
            responder(new stdClass());
        }

        if ($method === 'PUT') {
            $valor = json_encode($body);
            $stmt = $pdo->prepare("REPLACE INTO configuracion (clave, valor) VALUES ('gecko_laserParams', ?)");
            $stmt->execute([$valor]);
            responder(["success" => true, "message" => "Parámetros láser guardados."]);
        }
    }

    // ══════════════════════════════════════════
    // SEED SERVICIOS LASER
    // ══════════════════════════════════════════
    elseif ($endpoint === 'seed_laser') {

        if ($method === 'POST') {
            $faltantes = [
                ['CORTE LASER - MDF 3MM',       'mtL', 'Servicios de Corte'],
                ['CORTE LASER - MDF 5.5MM',     'mtL', 'Servicios de Corte'],
                ['CORTE LASER - POLIFAN 2CM',   'mtL', 'Servicios de Corte'],
                ['CORTE LASER - POLIFAN 3CM',   'mtL', 'Servicios de Corte'],
                ['CORTE LASER - POLIFAN 4CM',   'mtL', 'Servicios de Corte'],
                ['CORTE LASER - POLIFAN 5CM',   'mtL', 'Servicios de Corte'],
                ['CORTE LASER - BICAPA',        'mtL', 'Servicios de Corte'],
                ['CORTE LASER - CARTON 6MM',    'mtL', 'Servicios de Corte'],
                ['CORTE LASER - FIBRA PLUS',    'mtL', 'Servicios de Corte'],
                ['CORTE CNC - CHAPA TERMEL',    'mtL', 'Servicios de Corte'],
                ['CORTE CNC - CHAPA IACMA',     'mtL', 'Servicios de Corte'],
            ];
            $insertados = 0;
            $stmt = $pdo->prepare(
                "INSERT IGNORE INTO servicios (id, nombre, categoria, costo, unidad, precio)
                 VALUES (?, ?, ?, 0, ?, 0)"
            );
            foreach ($faltantes as $f) {
                $id = 'laser_' . strtolower(preg_replace('/[^a-z0-9]/i', '_', $f[0]));
                $stmt->execute([$id, $f[0], $f[2], $f[1]]);
                $insertados += $stmt->rowCount();
            }
            responder(["success" => true, "insertados" => $insertados]);
        }
    }

    // ══════════════════════════════════════════
    // HISTORICO CIERRES
    // ══════════════════════════════════════════
    elseif ($endpoint === 'historico_cierres') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM historico_cierres ORDER BY anio ASC, mes ASC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        if ($method === 'POST') {
            $d = $body;
            $stmt = $pdo->prepare("INSERT INTO historico_cierres (id, periodo, mes, anio, ingresos, gastos, balance, fecha_cierre, movimientos, gastos_fijos) VALUES (?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid('cierre_'),
                $d['periodo'] ?? '', $d['mes'] ?? 0, $d['anio'] ?? 0,
                $d['ingresos'] ?? 0, $d['gastos'] ?? 0, $d['balance'] ?? 0,
                $d['fecha_cierre'] ?? '', $d['movimientos'] ?? 0, $d['gastos_fijos'] ?? 0
            ]);
            responder(["success" => true, "message" => "Cierre guardado."]);
        }

        if ($method === 'DELETE') {
            $d = $body;
            $stmt = $pdo->prepare("DELETE FROM historico_cierres WHERE id = ?");
            $stmt->execute([$d['id']]);
            responder(["success" => true, "message" => "Cierre eliminado."]);
        }
    }

    // ══════════════════════════════════════════
    // CONFIGURACION
    // ══════════════════════════════════════════
    elseif ($endpoint === 'configuracion') {

        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT valor FROM configuracion WHERE clave = 'GECKO_SETTINGS'");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                responder(json_decode($row['valor'], true) ?: new stdClass());
            }
            responder(new stdClass());
        }

        if ($method === 'PUT') {
            $valor = json_encode($body);
            $stmt = $pdo->prepare("REPLACE INTO configuracion (clave, valor) VALUES ('GECKO_SETTINGS', ?)");
            $stmt->execute([$valor]);
            responder(["success" => true, "message" => "Configuración guardada."]);
        }
    }

    else {
        error("Endpoint no válido: '$endpoint'", 404);
    }

} catch (PDOException $e) {
    error("Error de base de datos: " . $e->getMessage(), 500);
}
?>
