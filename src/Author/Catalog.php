<?php
namespace GisClient\Author;

class Catalog
{
    const LOCAL_FOLDER_CONNECTION = 1;
    const POSTGIS_CONNECTION = 6;
    const WMS_CONNECTION = 7;
    const WFS_CONNECTION = 9;

    private $db;
    private $data;

    public function __construct($id = null)
    {
        if ($id) {
            $this->db = new Db();

            $sql = "SELECT * FROM {$this->db->getParams()['schema']}.catalog WHERE catalog_id = ?";
            $stmt = $this->db->getDb()->prepare($sql);
            $stmt->execute(array($id));
            $data = $stmt->fetch();
            if (!empty($data)) {
                $this->data = $data;
            } else {
                throw new \Exception("Error: catalog with id = '$id' not found", 1);
            }
        }
    }

    private function get($value)
    {
        if (!empty($this->data)) {
            return $this->data[$value];
        } else {
            throw new \Exception("Error: property '$value' not found", 1);
        }
    }

    public function getConnectionType()
    {
        return $this->get('connection_type');
    }

    public function getId()
    {
        return $this->get('catalog_id');
    }

    public function getPath()
    {
        return $this->get('catalog_path');
    }
}