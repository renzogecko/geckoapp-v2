<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
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
                 tieneParametrosCorte, corteSpeed, cortePower)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'] ?? uniqid(), $d['nombre'] ?? '', $d['categoria'] ?? '',
                $d['subcategoria'] ?? null, $d['stock'] ?? 0, $d['multiplicador'] ?? 2.0,
                $d['costoUSD'] ?? 0, $d['costoARS'] ?? 0, $d['unidad'] ?? 'unidad',
                $d['unidadVenta'] ?? 'unidad', $d['incluyeIva'] ? 1 : 0,
                $d['estrategiaVenta'] ?? 'dinamica', $d['costo'] ?? 0,
                $d['contenidoUnidad'] ?? 1, $d['ancho'] ?? null, $d['largo'] ?? null,
                $d['espesor'] ?? null, $d['cortePrecioML'] ?? $d['precioCorteMl'] ?? null,
                $d['nota'] ?? null, $d['multGremio'] ?? 1.5, $d['precioGremio'] ?? 0,
                $d['tieneParametrosCorte'] ? 1 : 0,
                $d['corteSpeed'] ?? null, $d['cortePower'] ?? null
            ]);
            responder(["success" => true, "message" => "Material creado."]);
        }

        if ($method === 'PUT') {
            $d = $body;
            $stmt = $pdo->prepare("REPLACE INTO materiales
                (id, nombre, categoria, subcategoria, stock, multiplicador, costoUSD, costoARS,
                 unidad, unidadVenta, incluyeIva, estrategiaVenta, costo, contenidoUnidad,
                 ancho, largo, espesor, precioCorteMl, nota, multGremio, precioGremio,
                 tieneParametrosCorte, corteSpeed, cortePower)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $stmt->execute([
                $d['id'], $d['nombre'] ?? '', $d['categoria'] ?? '',
                $d['subcategoria'] ?? null, $d['stock'] ?? 0, $d['multiplicador'] ?? 2.0,
                $d['costoUSD'] ?? 0, $d['costoARS'] ?? 0, $d['unidad'] ?? 'unidad',
                $d['unidadVenta'] ?? 'unidad', $d['incluyeIva'] ? 1 : 0,
                $d['estrategiaVenta'] ?? 'dinamica', $d['costo'] ?? 0,
                $d['contenidoUnidad'] ?? 1, $d['ancho'] ?? null, $d['largo'] ?? null,
                $d['espesor'] ?? null, $d['cortePrecioML'] ?? $d['precioCorteMl'] ?? null,
                $d['nota'] ?? null, $d['multGremio'] ?? 1.5, $d['precioGremio'] ?? 0,
                $d['tieneParametrosCorte'] ? 1 : 0,
                $d['corteSpeed'] ?? null, $d['cortePower'] ?? null
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
            // Decodificar items JSON
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

    elseif ($endpoint === 'gastos_fijos') {
        if ($method === 'GET') {
            $stmt = $pdo->query("CREATE TABLE IF NOT EXISTS gastos_fijos (
                id VARCHAR(64) PRIMARY KEY,
                concepto VARCHAR(255) NOT NULL,
                monto DECIMAL(15,2) DEFAULT 0,
                vencimiento VARCHAR(10) DEFAULT '',
                estado VARCHAR(50) DEFAULT 'Pendiente',
                caja VARCHAR(100) DEFAULT ''
            )");
            $stmt = $pdo->query("SELECT * FROM gastos_fijos ORDER BY concepto ASC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC)); exit;
        }
        if ($method === 'POST') {
            $b = json_decode(file_get_contents('php://input'), true);
            $id = $b['id'] ?? uniqid('gf_');
            $stmt = $pdo->prepare("INSERT INTO gastos_fijos (id, concepto, monto, vencimiento, estado, caja) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE concepto=VALUES(concepto), monto=VALUES(monto), vencimiento=VALUES(vencimiento), estado=VALUES(estado), caja=VALUES(caja)");
            $stmt->execute([$id, $b['concepto']??'', $b['monto']??0, $b['vencimiento']??'', $b['estado']??'Pendiente', $b['caja']??'']);
            echo json_encode(['success'=>true,'id'=>$id]); exit;
        }
        if ($method === 'PUT') {
            $b = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE gastos_fijos SET concepto=?, monto=?, vencimiento=?, estado=?, caja=? WHERE id=?");
            $stmt->execute([$b['concepto']??'', $b['monto']??0, $b['vencimiento']??'', $b['estado']??'Pendiente', $b['caja']??'', $b['id']]);
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
    // LASER PARAMS (speed/power/espesor por servicio)
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
    // SEED SERVICIOS LASER (insertar faltantes)
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
    // CONFIGURACION (GECKO_SETTINGS)
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
